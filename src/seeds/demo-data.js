// 展示用的分類與商品。品牌與品名皆為虛構。
// 圖片使用佔位圖服務：依分類配色，圖上顯示英文型號。

const IMAGE_SIZE = '600x600';

function imageUrl(background, label) {
  return `https://placehold.co/${IMAGE_SIZE}/${background}/ffffff?text=${encodeURIComponent(label).replace(/%20/g, '+')}`;
}

const catalog = [
  {
    name: '跑鞋',
    color: '1d4ed8',
    products: [
      ['Stridea Aero 3 輕量競速跑鞋', 'Aero 3', 4280, '全掌回彈中底搭配碳纖維推進片，適合比賽日與節奏跑。'],
      ['Stridea Daily 5 緩震訓練跑鞋', 'Daily 5', 3280, '厚實緩震、耐磨大底，日常慢跑與長距離訓練的主力鞋款。'],
      ['Kairo Trail X 越野跑鞋', 'Trail X', 3880, '深紋抓地大底與防撞鞋頭，應付泥地與碎石路面。'],
      ['Kairo Tempo 2 節奏訓練鞋', 'Tempo 2', 3580, '輕量且反應快，適合間歇與配速課表。'],
      ['Veloce Cloud 8 高緩震跑鞋', 'Cloud 8', 3980, '加厚中底帶來柔軟腳感，恢復跑與長時間站立都舒適。'],
      ['Veloce Start 入門慢跑鞋', 'Start', 1980, '平價入門款，透氣網布鞋面，適合剛開始跑步的你。'],
      ['Stridea Stable 4 支撐型跑鞋', 'Stable 4', 3680, '內側加強支撐，改善過度內旋，穩定每一步。'],
    ],
  },
  {
    name: '服飾',
    color: '047857',
    products: [
      ['Veloce Dry 透氣排汗短袖', 'Dry Tee', 890, '吸濕排汗布料，快乾不黏身，訓練比賽都適用。'],
      ['Veloce Dry 透氣排汗背心', 'Dry Tank', 790, '無袖剪裁活動更自由，夏季長跑首選。'],
      ['Kairo Split 3 吋競速短褲', 'Split 3in', 1180, '側開衩設計不卡腿，內附三角內裡與後腰拉鍊袋。'],
      ['Kairo Flex 壓縮緊身長褲', 'Flex Tights', 1680, '漸進式壓縮支撐肌群，膝後透氣網布不悶熱。'],
      ['Stridea Shell 防風防潑水外套', 'Shell', 2480, '可收納成掌心大小的輕量風衣，應付多變天氣。'],
      ['Stridea Warm 保暖長袖', 'Warm LS', 1380, '內刷毛保暖布料與拇指扣設計，冬季晨跑不怕冷。'],
      ['Veloce Reflect 反光長袖', 'Reflect LS', 1480, '360 度反光條，夜跑更容易被看見。'],
    ],
  },
  {
    name: '配件',
    color: 'b45309',
    products: [
      ['Kairo Cap 輕量透氣跑帽', 'Cap', 680, '雷射透氣孔與吸汗內帶，遮陽又不悶熱。'],
      ['Kairo Toe 五趾跑襪', 'Toe Socks', 320, '五趾分離減少摩擦與水泡，足弓加壓包覆。'],
      ['Stridea Belt 彈性腰包', 'Belt', 590, '貼身不晃動，可放手機、鑰匙與能量膠。'],
      ['Stridea Vest 5L 越野水袋背心', 'Vest 5L', 2980, '前置雙軟水壺袋與後背主袋，長距離越野必備。'],
      ['Veloce Flask 500ml 軟水壺', 'Flask 500', 480, '可擠壓收納的軟式水壺，喝完不佔空間。'],
      ['Veloce Calf 壓縮小腿套', 'Calf', 780, '漸進式壓力設計，減少小腿震動與疲勞。'],
      ['Kairo Arm 抗 UV 袖套', 'Arm Sleeves', 420, 'UPF 50+ 防曬布料，涼感透氣。'],
    ],
  },
  {
    name: '補給',
    color: 'be123c',
    products: [
      ['Fuelo 能量膠 柑橘口味（單包）', 'Gel Citrus', 65, '每包 25 克碳水化合物，快速補充能量。'],
      ['Fuelo 能量膠 咖啡口味（單包）', 'Gel Coffee', 70, '含 50 毫克咖啡因，適合比賽後段提振精神。'],
      ['Fuelo 能量膠 綜合 12 入組', 'Gel 12 Pack', 720, '四種口味各三包，長距離訓練一次備齊。'],
      ['Saltix 電解質錠（20 錠）', 'Electrolyte', 350, '補充鈉、鉀、鎂，丟進水壺即溶。'],
      ['Saltix 鹽錠（30 粒）', 'Salt Caps', 290, '大量流汗時預防抽筋的隨身補給。'],
      ['Fuelo 能量棒 堅果口味', 'Energy Bar', 55, '燕麥與堅果製成，跑前跑後都適合。'],
      ['Recova 乳清恢復飲（10 包）', 'Recovery', 890, '碳水與蛋白質 3 比 1，加速跑後恢復。'],
    ],
  },
  {
    name: '電子裝置',
    color: '6d28d9',
    products: [
      ['Pacer One GPS 跑錶', 'Pacer One', 6990, '雙頻定位、光學心率與 14 天續航，支援配速課表。'],
      ['Pacer Lite 入門 GPS 跑錶', 'Pacer Lite', 3990, '輕巧易上手，紀錄距離、配速與心率。'],
      ['Pulse Band 心率胸帶', 'Pulse Band', 1890, '心電式感測更準確，支援藍牙與 ANT+ 連線。'],
      ['OpenAir 骨傳導運動耳機', 'OpenAir', 3280, '不入耳設計，聽音樂同時留意周遭環境。'],
      ['Beam 200 夜跑頭燈', 'Beam 200', 1280, '200 流明、USB-C 充電，重量僅 45 克。'],
      ['Blink 夜跑警示夾燈（2 入）', 'Blink', 390, '可夾在衣物或背包上的紅色閃爍警示燈。'],
      ['Stride Pod 跑步動態感測器', 'Stride Pod', 2490, '夾在鞋帶上，量測步頻、觸地時間與垂直振幅。'],
    ],
  },
];

const categories = catalog.map((category) => ({
  name: category.name,
  products: category.products.map(([name, label, price, description]) => ({
    name,
    price,
    description,
    imageUrl: imageUrl(category.color, label),
  })),
}));

module.exports = { categories };
