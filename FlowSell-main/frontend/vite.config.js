import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  return {
    plugins:[react()],
    // Compatibilidad con la única variable pública utilizada por versiones anteriores.
    define:{'process.env.REACT_APP_HOST_HOOKS':JSON.stringify(env.REACT_APP_HOST_HOOKS||'')},
    server:{host:'127.0.0.1',port:3000,strictPort:true,proxy:{'/api':{target:'http://localhost:8080',changeOrigin:false}}},
    build:{outDir:'build',emptyOutDir:true,sourcemap:false},
  };
});
