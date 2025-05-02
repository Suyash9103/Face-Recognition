import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";

function ThreeScene() {
  return (
    <Canvas className="absolute top-0 left-0 w-full h-full">
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 5, 2]} intensity={1} />
      <OrbitControls enableZoom={false} />
      <Sphere visible args={[1, 100, 200]} scale={2.5}>
        <MeshDistortMaterial color="cyan" attach="material" distort={0.5} speed={2} />
      </Sphere>
    </Canvas>
  );
}

export default ThreeScene;
