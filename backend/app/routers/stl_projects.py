"""Router de projetos STL - upload (STLs e ZIPs), GCode, download, gerenciamento."""

import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session

from ..config import UPLOADED_MODELS_DIR, GCODES_DIR, THINGIVERSE_MODELS_DIR
from ..database import get_db
from .. import models, schemas
from ..paths import rel, abs_path
from ..services.settings_file import load_settings
from ..services.moonraker import upload_file_to_moonraker, start_print
from .costs import parse_gcode_text, estimate_cost, CostEstimate

router = APIRouter(prefix="/stl", tags=["stl"])


@router.get("/file-types", response_model=List[schemas.FileTypeResponse])
def list_file_types(db: Session = Depends(get_db)):
    """Lista tipos de arquivo (stl, gcode)."""
    return db.query(models.FileType).order_by(models.FileType.code).all()


@router.get("/source-types", response_model=List[schemas.SourceTypeResponse])
def list_source_types(db: Session = Depends(get_db)):
    """Lista tipos de origem (upload, thingiverse)."""
    return db.query(models.SourceType).order_by(models.SourceType.code).all()


@router.get("/projects", response_model=List[schemas.StlProjectResponse])
def list_projects(source: str = None, db: Session = Depends(get_db)):
    """Lista projetos STL. Filtro opcional: source=thingiverse|upload."""
    q = db.query(models.StlProject)
    if source:
        q = q.filter(models.StlProject.source == source)
    return q.order_by(models.StlProject.created_at.desc()).all()


@router.get("/projects/{project_id}", response_model=schemas.StlProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Detalhes de um projeto."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


@router.patch("/projects/{project_id}", response_model=schemas.StlProjectResponse)
def update_project(project_id: int, payload: schemas.StlProjectUpdate, db: Session = Depends(get_db)):
    """Atualiza título/descrição de um projeto.
    Se title for preenchido, info_pending vira False e um Product é criado automaticamente.
    """
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if payload.title is not None:
        project.title = payload.title
        project.info_pending = False
        for f in project.files:
            f.is_sliced = f.file_type == "gcode"
        existing_product = None
        if project.thing_id:
            existing_product = db.query(models.Product).filter(
                models.Product.thing_id == project.thing_id
            ).first()
        if not existing_product:
            existing_product = db.query(models.Product).filter(
                models.Product.title == payload.title
            ).first()
        if not existing_product:
            product = models.Product(
                title=payload.title,
                description=payload.description or project.description or "",
                local_path=project.path,
                is_sliced=any(f.is_sliced for f in project.files),
            )
            db.add(product)
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Remove um projeto STL, seus arquivos no disco e registros no banco."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    proj_path = abs_path(project.path).resolve()
    allowed_dirs = [p.resolve() for p in [UPLOADED_MODELS_DIR, GCODES_DIR, THINGIVERSE_MODELS_DIR]]
    if not any(str(proj_path).startswith(str(d)) for d in allowed_dirs):
        raise HTTPException(status_code=403, detail="Caminho do projeto fora dos diretórios permitidos")
    if proj_path.exists():
        shutil.rmtree(proj_path)
    db.delete(project)
    db.commit()
    return {"detail": "Projeto removido"}


@router.post("/projects/{project_id}/link-gcode", response_model=schemas.StlProjectResponse)
async def link_gcode(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Faz upload de um GCode e vincula a um projeto.
    Remove a label 'não fatiado' para os arquivos com GCode vinculado.
    Automaticamente analisa o GCode para extrair gramas/tempo e
    atualiza os custos do produto associado.
    """
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if not file.filename.lower().endswith(".gcode"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .gcode são aceitos")

    proj_dir = GCODES_DIR / project.name
    proj_dir.mkdir(parents=True, exist_ok=True)
    dest = proj_dir / file.filename
    content = await file.read()
    try:
        with open(dest, "wb") as f:
            f.write(content)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar GCode: {e}")

    gcode_file = models.StlFile(
        project_id=project.id,
        filename=file.filename,
        file_path=rel(dest),
        file_type="gcode",
        is_sliced=True,
    )
    db.add(gcode_file)

    parsed = parse_gcode_text(content.decode("utf-8", errors="replace"))

    product = db.query(models.Product).filter(
        models.Product.title == (project.title or project.name)
    ).first()

    if product and parsed["filament_grams"] > 0:
        product.filament_grams = parsed["filament_grams"]
        product.print_time_seconds = parsed["print_time_seconds"]
        product.is_sliced = True

        settings = load_settings()
        costs = settings.costs

        payload = CostEstimate(
            filament_grams=parsed["filament_grams"],
            print_time_seconds=parsed["print_time_seconds"],
            filament_price_per_kg=0,
            printer_watts=costs.printer_watts,
            kwh_rate=costs.kwh_rate,
            labor_cost_per_hour=costs.labor_cost_per_hour,
            fixed_cost_per_print=costs.fixed_cost_per_print,
            ecommerce_fee_percent=costs.ecommerce_fee_percent,
            profit_margin_percent=costs.profit_margin_percent,
        )
        result = estimate_cost(payload)

        if not product.variants:
            variant_name = Path(file.filename).stem.replace("_gcode", "").replace("-gcode", "").strip()
            if not variant_name or variant_name == Path(file.filename).stem:
                variant_name = "Padrão"
            variant = models.ProductVariant(
                product_id=product.id,
                name=variant_name,
                production_cost=result.production_cost,
                sale_price=result.final_price,
            )
            db.add(variant)

    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}/download/stl")
def download_stl(project_id: int, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Baixa STL(s) do projeto. Se for pasta, baixa .zip."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)

    stl_files = [f for f in project.files if f.file_type == "stl"]
    if not stl_files:
        raise HTTPException(status_code=404, detail="Nenhum arquivo STL encontrado")

    for sf in stl_files:
        if not abs_path(sf.file_path).exists():
            raise HTTPException(status_code=404, detail="Arquivo STL não encontrado no disco")

    if len(stl_files) == 1:
        from fastapi.responses import FileResponse
        return FileResponse(str(abs_path(stl_files[0].file_path)), filename=stl_files[0].filename,
                            media_type="application/sla")
    else:
        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
            for sf in stl_files:
                zf.write(str(abs_path(sf.file_path)), arcname=sf.filename)
        tasks.add_task(os.unlink, tmp.name)
        from fastapi.responses import FileResponse
        return FileResponse(tmp.name, filename=f"{project.name}.zip",
                            media_type="application/zip")


@router.get("/projects/{project_id}/download/gcode")
def download_gcode(project_id: int, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Baixa GCode(s) do projeto. Se for pasta, baixa .zip."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)

    gcode_files = [f for f in project.files if f.file_type == "gcode"]
    if not gcode_files:
        raise HTTPException(status_code=404, detail="Nenhum arquivo GCode encontrado")

    for gf in gcode_files:
        if not abs_path(gf.file_path).exists():
            raise HTTPException(status_code=404, detail="Arquivo GCode não encontrado no disco")

    if len(gcode_files) == 1:
        from fastapi.responses import FileResponse
        return FileResponse(str(abs_path(gcode_files[0].file_path)), filename=gcode_files[0].filename,
                            media_type="text/plain")
    else:
        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
            for gf in gcode_files:
                zf.write(str(abs_path(gf.file_path)), arcname=gf.filename)
        tasks.add_task(os.unlink, tmp.name)
        from fastapi.responses import FileResponse
        return FileResponse(tmp.name, filename=f"{project.name}_gcode.zip",
                            media_type="application/zip")


@router.post("/projects/{project_id}/send-to-printer")
async def send_to_printer(project_id: int, start: bool = Query(False, description="Iniciar impressão imediatamente"), db: Session = Depends(get_db)):
    """Envia o GCode do projeto para o Moonraker. Opcionalmente inicia a impressão."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    gcode_files = [f for f in project.files if f.file_type == "gcode"]
    if not gcode_files:
        raise HTTPException(status_code=400, detail="Nenhum GCode vinculado a este projeto")

    gcode_file = gcode_files[0]
    gcode_path = abs_path(gcode_file.file_path)
    if not gcode_path.exists():
        raise HTTPException(status_code=400, detail="Arquivo GCode não encontrado no disco")

    try:
        await upload_file_to_moonraker(gcode_file.filename, str(gcode_path))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao enviar para Moonraker: {e}")

    result = {"detail": "GCode enviado para Moonraker", "filename": gcode_file.filename}

    if start:
        try:
            await start_print(gcode_file.filename)
            result["detail"] = f"Impressão de {gcode_file.filename} iniciada"
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Erro ao iniciar impressão: {e}")

    return result


@router.delete("/projects/{project_id}/files/{file_id}")
def unlink_file(project_id: int, file_id: int, db: Session = Depends(get_db)):
    """Desvincula um arquivo (STL ou GCode) do projeto e remove do disco."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    stl_file = db.query(models.StlFile).filter(
        models.StlFile.id == file_id,
        models.StlFile.project_id == project_id,
    ).first()
    if not stl_file:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    fpath = abs_path(stl_file.file_path)
    if fpath.exists():
        fpath.unlink()
    db.delete(stl_file)
    db.commit()
    return {"detail": "Arquivo removido"}


@router.put("/projects/{project_id}/gcode", response_model=schemas.StlProjectResponse)
async def replace_gcode(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Substitui o GCode existente por um novo. Remove o GCode antigo e vincula o novo."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if not file.filename.lower().endswith(".gcode"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .gcode são aceitos")

    old_gcodes = [f for f in project.files if f.file_type == "gcode"]
    for old in old_gcodes:
        fpath = abs_path(old.file_path)
        if fpath.exists():
            fpath.unlink()
        db.delete(old)

    proj_dir = GCODES_DIR / project.name
    proj_dir.mkdir(parents=True, exist_ok=True)
    dest = proj_dir / file.filename
    content = await file.read()
    try:
        with open(dest, "wb") as f:
            f.write(content)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar GCode: {e}")

    gcode_file = models.StlFile(
        project_id=project.id,
        filename=file.filename,
        file_path=rel(dest),
        file_type="gcode",
        is_sliced=True,
    )
    db.add(gcode_file)

    parsed = parse_gcode_text(content.decode("utf-8", errors="replace"))

    product = db.query(models.Product).filter(
        models.Product.title == (project.title or project.name)
    ).first()

    if product and parsed["filament_grams"] > 0:
        product.filament_grams = parsed["filament_grams"]
        product.print_time_seconds = parsed["print_time_seconds"]
        product.is_sliced = True

        settings = load_settings()
        costs = settings.costs

        payload = CostEstimate(
            filament_grams=parsed["filament_grams"],
            print_time_seconds=parsed["print_time_seconds"],
            filament_price_per_kg=0,
            printer_watts=costs.printer_watts,
            kwh_rate=costs.kwh_rate,
            labor_cost_per_hour=costs.labor_cost_per_hour,
            fixed_cost_per_print=costs.fixed_cost_per_print,
            ecommerce_fee_percent=costs.ecommerce_fee_percent,
            profit_margin_percent=costs.profit_margin_percent,
        )
        result = estimate_cost(payload)

        if not product.variants:
            variant_name = Path(file.filename).stem.replace("_gcode", "").replace("-gcode", "").strip()
            if not variant_name or variant_name == Path(file.filename).stem:
                variant_name = "Padrão"
            variant = models.ProductVariant(
                product_id=product.id,
                name=variant_name,
                production_cost=result.production_cost,
                sale_price=result.final_price,
            )
            db.add(variant)

    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}/files/{file_id}/view")
async def view_stl_file(project_id: int, file_id: int, db: Session = Depends(get_db)):
    """Serve um arquivo STL individual para visualização 3D."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    stl_file = db.query(models.StlFile).filter(
        models.StlFile.id == file_id,
        models.StlFile.project_id == project_id,
        models.StlFile.file_type == "stl",
    ).first()
    if not stl_file:
        raise HTTPException(status_code=404, detail="Arquivo STL não encontrado")

    file_path = abs_path(stl_file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no disco")

    from fastapi.responses import FileResponse
    return FileResponse(str(file_path), media_type="model/stl", filename=stl_file.filename)


@router.post("/upload", response_model=schemas.StlProjectResponse)
async def upload_stl(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Upload de um ou mais arquivos STL ou ZIP (contendo STLs). Cria um projeto com info_pending=True."""
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    stl_files = []
    zip_files = []
    for f in files:
        name_lower = f.filename.lower()
        if name_lower.endswith(".stl"):
            stl_files.append(f)
        elif name_lower.endswith(".zip"):
            zip_files.append(f)

    if not stl_files and not zip_files:
        raise HTTPException(status_code=400, detail="Aceito apenas .stl e .zip (com .stl dentro)")

    project_name = "projeto"
    if stl_files:
        project_name = Path(stl_files[0].filename).stem
        if len(stl_files) > 1:
            common = Path(stl_files[0].filename).stem.split("_")[0].split("-")[0][:30]
            project_name = common if common else "projeto"
    else:
        project_name = Path(zip_files[0].filename).stem[:30]

    proj_dir = UPLOADED_MODELS_DIR / project_name
    proj_dir.mkdir(parents=True, exist_ok=True)

    project = models.StlProject(
        name=project_name,
        path=rel(proj_dir),
        source="upload",
        info_pending=True,
    )
    db.add(project)
    db.flush()

    extracted_names = set()
    for zf in zip_files:
        z_path = proj_dir / zf.filename
        content = await zf.read()
        z_path.write_bytes(content)
        try:
            with zipfile.ZipFile(z_path) as z:
                for member in z.namelist():
                    if member.lower().endswith(".stl"):
                        dest = proj_dir / Path(member).name
                        dest.write_bytes(z.read(member))
                        if member not in extracted_names:
                            extracted_names.add(member)
                            db.add(models.StlFile(
                                project_id=project.id,
                                filename=dest.name,
                                file_path=rel(dest),
                                file_type="stl",
                            ))
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail=f"Arquivo inválido: {zf.filename}")

    for f in stl_files:
        dest = proj_dir / f.filename
        with open(dest, "wb") as df:
            shutil.copyfileobj(f.file, df)
        db.add(models.StlFile(
            project_id=project.id,
            filename=f.filename,
            file_path=rel(dest),
            file_type="stl",
        ))

    db.commit()
    db.refresh(project)
    return project
