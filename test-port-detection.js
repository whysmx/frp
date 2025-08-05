/**
 * 测试端口检测功能
 */

async function testPortDetection() {
  const commonPorts = [7400, 7401, 7402, 7500, 8080, 8081]
  const host = 'localhost'
  
  console.log('开始测试端口检测...')
  
  for (const port of commonPorts) {
    try {
      console.log(`测试端口 ${port}...`)
      
      const response = await fetch(`http://${host}:${port}/api/config`, {
        method: 'HEAD',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:admin'),
        },
        signal: AbortSignal.timeout(2000)
      })
      
      if (response.ok || response.status === 401) {
        console.log(`✓ 检测到 frpc admin 端口: ${port}`)
        console.log(`状态码: ${response.status}`)
        return port
      } else {
        console.log(`✗ 端口 ${port} 响应状态: ${response.status}`)
      }
    } catch (error) {
      console.log(`✗ 端口 ${port} 连接失败: ${error.message}`)
    }
  }
  
  console.log('未检测到任何可用端口')
  return null
}

testPortDetection().then(port => {
  if (port) {
    console.log(`\n最终结果: frpc admin 端口为 ${port}`)
  } else {
    console.log('\n最终结果: 未找到 frpc admin 端口')
  }
}).catch(console.error)