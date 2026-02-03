
async function testTencentAPI() {
  const codes = ['sh600519', 'sz000001']; // Moutai, Ping An
  const url = `https://qt.gtimg.cn/q=${codes.join(',')}`;

  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('--- Raw Response ---');
    console.log(text);
    console.log('--------------------');

    // Parse logic test
    const lines = text.split(';');
    lines.forEach(line => {
      if (line.trim().length > 10) {
        const parts = line.split('=')[1].replace(/"/g, '').split('~');
        console.log(`\nAnalyzing ${parts[1]} (${parts[2]}):`);
        console.log(`Price (Index 3): ${parts[3]}`);
        console.log(`Change% (Index 32): ${parts[32]}%`);
        console.log(`PE TTM (Index 39): ${parts[39]}`);
        console.log(`Market Cap (Index 45 - Total?): ${parts[45]}`);
        console.log(`Circulating Market Cap (Index 44?): ${parts[44]}`);
        
        // Print all with index for debugging
        parts.forEach((p, i) => {
            if (p && p.length > 0) console.log(`[${i}]: ${p}`);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testTencentAPI();
