import localtunnel from 'localtunnel';

(async () => {
  const tunnel = await localtunnel({ port: 3000 });

  console.log('\n========================================');
  console.log('公网访问地址: ' + tunnel.url);
  console.log('========================================\n');

  tunnel.on('close', () => {
    console.log('隧道已关闭');
  });
})();
