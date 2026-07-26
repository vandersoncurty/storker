"""Testes de upload e otimização de imagens de produtos."""

from io import BytesIO

from PIL import Image


def _make_test_image(width=800, height=600, fmt="JPEG"):
    img = Image.new("RGB", (width, height), color=(100, 149, 237))
    buf = BytesIO()
    img.save(buf, fmt)
    buf.seek(0)
    return buf


def test_upload_image(client):
    client.post("/products/", json={"title": "Produto Teste", "description": "Test"})
    img = _make_test_image()
    resp = client.post("/products/1/images/upload", files={"file": ("test.jpg", img, "image/jpeg")})
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_primary"] is True
    assert data["source"] == "upload"
    assert data["file_path"].endswith(".jpg")


def test_upload_multiple_images(client):
    client.post("/products/", json={"title": "Produto Teste", "description": "Test"})
    img1 = _make_test_image()
    img2 = _make_test_image()
    r1 = client.post("/products/1/images/upload", files={"file": ("img1.jpg", img1, "image/jpeg")})
    assert r1.status_code == 200
    r2 = client.post("/products/1/images/upload", files={"file": ("img2.jpg", img2, "image/jpeg")})
    assert r2.status_code == 200
    assert r1.json()["is_primary"] is True
    assert r2.json()["is_primary"] is False


def test_upload_image_optimization_resize(client):
    from app.config import DATA_DIR
    client.post("/products/", json={"title": "Produto Teste", "description": "Test"})
    large_img = _make_test_image(width=3000, height=2000)
    resp = client.post("/products/1/images/upload", files={"file": ("large.jpg", large_img, "image/jpeg")})
    assert resp.status_code == 200

    saved = Image.open(DATA_DIR / resp.json()["file_path"])
    assert saved.width <= 1920
    assert saved.height <= 1920


def test_upload_image_png(client):
    client.post("/products/", json={"title": "Produto PNG", "description": "Test"})
    img = _make_test_image(fmt="PNG")
    resp = client.post("/products/1/images/upload", files={"file": ("test.png", img, "image/png")})
    assert resp.status_code == 200
    assert resp.json()["file_path"].endswith(".jpg")


def test_upload_image_webp(client):
    client.post("/products/", json={"title": "Produto WebP", "description": "Test"})
    img = _make_test_image(fmt="WEBP")
    resp = client.post("/products/1/images/upload", files={"file": ("test.webp", img, "image/webp")})
    assert resp.status_code == 200


def test_upload_image_invalid_format(client):
    client.post("/products/", json={"title": "Produto", "description": "Test"})
    resp = client.post("/products/1/images/upload", files={"file": ("test.bmp", b"fake", "image/bmp")})
    assert resp.status_code == 400


def test_set_primary_image(client):
    client.post("/products/", json={"title": "Produto", "description": "Test"})
    img1 = _make_test_image()
    img2 = _make_test_image()
    r1 = client.post("/products/1/images/upload", files={"file": ("img1.jpg", img1, "image/jpeg")})
    img1_id = r1.json()["id"]
    r2 = client.post("/products/1/images/upload", files={"file": ("img2.jpg", img2, "image/jpeg")})

    resp = client.patch(f"/products/1/images/{r2.json()['id']}/primary")
    assert resp.status_code == 200

    prod = client.get("/products/1").json()
    primary = [img for img in prod["images"] if img["is_primary"]]
    assert len(primary) == 1
    assert primary[0]["id"] == r2.json()["id"]


def test_delete_image(client):
    client.post("/products/", json={"title": "Produto", "description": "Test"})
    img = _make_test_image()
    r = client.post("/products/1/images/upload", files={"file": ("test.jpg", img, "image/jpeg")})
    img_id = r.json()["id"]

    resp = client.delete(f"/products/1/images/{img_id}")
    assert resp.status_code == 200

    prod = client.get("/products/1").json()
    assert len(prod["images"]) == 0


def test_upload_image_no_product(client):
    resp = client.post("/products/999/images/upload", files={"file": ("test.jpg", b"data", "image/jpeg")})
    assert resp.status_code == 404
