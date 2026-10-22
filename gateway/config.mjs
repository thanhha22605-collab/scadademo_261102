function port(value,fallback){const n=Number(value??fallback);if(!Number.isInteger(n)||n<1||n>65535)throw new Error('Port không hợp lệ.');return n;}
const interval=Number(process.env.POLL_MS??500);
if(!Number.isFinite(interval)||interval<100||interval>60000)throw new Error('POLL_MS phải từ 100 đến 60000.');
const adminToken=process.env.GATEWAY_ADMIN_TOKEN||'';
if(adminToken&&adminToken.length<24)throw new Error('GATEWAY_ADMIN_TOKEN phải có ít nhất 24 ký tự.');
export const config={
  pollMs:interval,wsPort:port(process.env.WS_PORT,8081),bindHost:process.env.GATEWAY_BIND_HOST||'127.0.0.1',
  adminToken,
  allowedOrigins:(process.env.GATEWAY_ALLOWED_ORIGINS||'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s=>s.trim()).filter(Boolean),
  mock:process.env.MOCK==='true',
};
