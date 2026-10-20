import sharp from 'sharp';
await sharp(Buffer.from('<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="175" fill="#dbff64"/><text x="200" y="218" text-anchor="middle" font-family="Arial" font-size="60" font-weight="bold" fill="#17392e">STUDIO</text></svg>')).png().toFile('public/assets/demo.png');
