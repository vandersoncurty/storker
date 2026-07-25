"""Router de projetos STL - upload (STLs e ZIPs), GCode, download, gerenciamento."""

import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..config import UPLOADED_MODELS_DIR, GCODES_DIR
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/stl", tags=["stl"])


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
        existing_product = db.query(models.Product).filter(
            models.Product.thing_id == project.thing_id if project.thing_id else False
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
    proj_path = Path(project.path)
    if proj_path.exists():
        shutil.rmtree(proj_path)
    db.delete(project)
    db.commit()
    return {"detail": "Projeto removido"}


@router.post("/projects/{project_id}/link-gcode", response_model=schemas.StlProjectResponse)
async def link_gcode(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Faz upload de um GCode e vincula a um projeto.
    Remove a label 'não fatiado' para os arquivos com GCode vinculado.
    """
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    if not file.filename.lower().endswith(".gcode"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .gcode são aceitos")

    proj_dir = GCODES_DIR / project.name
    proj_dir.mkdir(parents=True, exist_ok=True)
    dest = proj_dir / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    gcode_file = models.StlFile(
        project_id=project.id,
        filename=file.filename,
        file_path=str(dest),
        file_type="gcode",
        is_sliced=True,
    )
    db.add(gcode_file)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}/download/stl")
def download_stl(project_id: int, db: Session = Depends(get_db)):
    """Baixa STL(s) do projeto. Se for pasta, baixa .zip."""
    import os as _os

    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)

    stl_files = [f for f in project.files if f.file_type == "stl"]
    if not stl_files:
        raise HTTPException(status_code=404, detail="Nenhum arquivo STL encontrado")

    proj_dir = Path(stl_files[0].file_path).parent
    if len(stl_files) == 1:
        from fastapi.responses import FileResponse
        return FileResponse(stl_files[0].file_path, filename=stl_files[0].filename,
                            media_type="application/sla")
    else:
        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
            for sf in stl_files:
                zf.write(sf.file_path, arcname=sf.filename)
        from fastapi.responses import FileResponse
        return FileResponse(tmp.name, filename=f"{project.name}.zip",
                            media_type="application/zip")


@router.get("/projects/{project_id}/download/gcode")
def download_gcode(project_id: int, db: Session = Depends(get_db)):
    """Baixa GCode(s) do projeto. Se for pasta, baixa .zip."""
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404)

    gcode_files = [f for f in project.files if f.file_type == "gcode"]
    if not gcode_files:
        raise HTTPException(status_code=404, detail="Nenhum arquivo GCode encontrado")

    if len(gcode_files) == 1:
        from fastapi.responses import FileResponse
        return FileResponse(gcode_files[0].file_path, filename=gcode_files[0].filename,
                            media_type="text/plain")
    else:
        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
            for gf in gcode_files:
                zf.write(gf.file_path, arcname=gf.filename)
        from fastapi.responses import FileResponse
        return FileResponse(tmp.name, filename=f"{project.name}_gcode.zip",
                            media_type="application/zip")


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
        path=str(proj_dir),
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
                                file_path=str(dest),
                                file_type="stl",
                            ))
            z_path.unlink()
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail=f"Arquivo inválido: {zf.filename}")

    for f in stl_files:
        dest = proj_dir / f.filename
        with open(dest, "wb") as df:
            shutil.copyfileobj(f.file, df)
        db.add(models.StlFile(
            project_id=project.id,
            filename=f.filename,
            file_path=str(dest),
            file_type="stl",
        ))

    db.commit()
    db.refresh(project)
    return project
