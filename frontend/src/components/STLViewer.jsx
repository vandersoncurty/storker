import { useEffect, useRef, useState } from 'react';

export default function STLViewer({ url, onClose }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let scene, camera, renderer, controls;

    const init = async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');

      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);

      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.set(5, 5, 10);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2;

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
      scene.add(hemiLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 10, 7);
      scene.add(dirLight);
      const backLight = new THREE.DirectionalLight(0x8888ff, 0.5);
      backLight.position.set(-5, 0, -7);
      scene.add(backLight);

      const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
      scene.add(grid);

      const loader = new STLLoader();
      try {
        const geometry = await loader.loadAsync(url);
        geometry.center();
        geometry.computeVertexNormals();

        const bbox = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position'));
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 3 / maxDim;
          geometry.scale(scale, scale, scale);
        }

        const material = new THREE.MeshPhongMaterial({
          color: 0x6c5ce7,
          specular: 0x222244,
          shininess: 60,
          flatShading: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        geometry.computeVertexNormals();
        setLoading(false);
      } catch {
        setError('Erro ao carregar STL');
        setLoading(false);
      }

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        const w2 = container.clientWidth;
        const h2 = container.clientHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      };
      window.addEventListener('resize', handleResize);
    };

    const containerEl = containerRef.current;
    init();

    return () => {
      if (renderer && containerEl) {
        renderer.dispose();
        if (renderer.domElement.parentElement === containerEl) {
          containerEl.removeChild(renderer.domElement);
        }
      }
      window.removeEventListener('resize', () => {});
    };
  }, [url]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        width: '90vw', height: '85vh', maxWidth: '960px',
        background: '#1a1a2e', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#12121e',
          borderBottom: '1px solid #2a2a3e',
        }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
            Visualizador 3D
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#888', cursor: 'pointer',
            fontSize: '20px', padding: '4px 8px',
          }}>✕</button>
        </div>
        <div ref={containerRef} style={{
          flex: 1, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading && (
            <span style={{ color: '#888', fontSize: '14px' }}>Carregando modelo 3D...</span>
          )}
          {error && (
            <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
