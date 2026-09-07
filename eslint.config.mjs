import nextVitals from 'eslint-config-next/core-web-vitals';
const config = [...nextVitals, { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'test-results/**'] },
 { rules: { 'react/no-unescaped-entities': 'off', 'react-hooks/set-state-in-effect': 'off', 'react-hooks/immutability': 'off', 'react-hooks/purity': 'off' } }];
export default config;