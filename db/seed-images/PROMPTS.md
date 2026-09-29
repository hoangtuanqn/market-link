# Seed image prompts (for Gemini / Nano Banana or any text-to-image tool)

Claude Code has no image-generation tool, so these images can't be generated automatically —
this file is the hand-off. Paste each prompt into your image generator, save the result with the
exact filename given, and drop it into the matching folder below. Once the files exist, running

```bash
make seed-images   # copies db/seed-images/{products,markets}/*.jpg into backend/uploads/
make seed          # loads db/seed.sql, which now points image_url at those files
```

wires everything up — no further code changes needed. `image_slug` already exists per row in
`db/seed.sql`; the filenames below match it exactly.

- Product images → save as `db/seed-images/products/<slug>.jpg`
- Market images → save as `db/seed-images/markets/<slug>.jpg`
- Aim for 1024×1024 (products) / 1024×768 (markets), JPG. Any image editor can resize/convert if
  the generator gives you something else.

Missing a file is harmless: `image_url` will just point at a 404 until you add it, everything else
(name, price, stock…) still seeds and works.

## Style guide (baked into every prompt below)

**Products:** `Professional food photography of {subject}, arranged on a rustic wooden table with
a woven bamboo tray, soft natural window light from the left, shallow depth of field, 45-degree
angle shot, photorealistic, high resolution, no text, no watermark, no people, no logos, warm
Vietnamese wet-market atmosphere, softly blurred background, square 1:1 aspect ratio.`

**Markets:** `Photorealistic wide-angle photo of {subject}, colorful stalls with fresh fruits and
vegetables, people shopping with backs turned or faces not clearly visible, vibrant but slightly
nostalgic tone, natural morning light, high resolution, no text overlay, no logos, no watermark,
landscape 4:3 aspect ratio.`

Keeping the wrapper identical for every item is what makes the 55 images look like one coherent
catalog instead of 55 random pictures.

## Markets (4)

| Filename | Prompt |
|---|---|
| `cho-ba-chieu.jpg` | Photorealistic wide-angle photo of a lively traditional Vietnamese wet market street in Bình Thạnh, Ho Chi Minh City, fresh produce stalls under colorful awnings, colorful stalls with fresh fruits and vegetables, people shopping with backs turned or faces not clearly visible, vibrant but slightly nostalgic tone, natural morning light, high resolution, no text overlay, no logos, no watermark, landscape 4:3 aspect ratio. |
| `cho-thao-dien.jpg` | Photorealistic wide-angle photo of a traditional Vietnamese market in Thảo Điền, Thủ Đức, fruit and vegetable stalls, tropical morning atmosphere, colorful stalls with fresh fruits and vegetables, people shopping with backs turned or faces not clearly visible, vibrant but slightly nostalgic tone, natural morning light, high resolution, no text overlay, no logos, no watermark, landscape 4:3 aspect ratio. |
| `cho-ben-thanh.jpg` | Photorealistic wide-angle photo of the interior of a historic Vietnamese covered market resembling Bến Thành market, Quận 1, vendors and fresh produce stalls, warm ambient lighting, colorful stalls with fresh fruits and vegetables, people shopping with backs turned or faces not clearly visible, vibrant but slightly nostalgic tone, natural morning light, high resolution, no text overlay, no logos, no watermark, landscape 4:3 aspect ratio. |
| `cho-tan-dinh.jpg` | Photorealistic wide-angle photo of a traditional neighborhood wet market in Tân Định, Quận 1, tin-roof awnings, fresh produce stalls, colorful stalls with fresh fruits and vegetables, people shopping with backs turned or faces not clearly visible, vibrant but slightly nostalgic tone, natural morning light, high resolution, no text overlay, no logos, no watermark, landscape 4:3 aspect ratio. |

## Products (51)

Each row = `Professional food photography of {subject}, arranged on a rustic wooden table with a
woven bamboo tray, soft natural window light from the left, shallow depth of field, 45-degree
angle shot, photorealistic, high resolution, no text, no watermark, no people, no logos, warm
Vietnamese wet-market atmosphere, softly blurred background, square 1:1 aspect ratio.` — only the
`{subject}` changes:

### Vegetables & herbs

| Filename | Product | Subject |
|---|---|---|
| `rau-muong.jpg` | Rau muống | a bundle of fresh water spinach (rau muống), tied with a rice straw, wet with morning dew, vivid green |
| `cai-ngot.jpg` | Cải ngọt | a bunch of choy sum (cải ngọt) with tender pale-green leaves and small yellow flower buds |
| `xa-lach-xoong.jpg` | Xà lách xoong | a bunch of watercress (xà lách xoong) with delicate curly leaves |
| `rau-den.jpg` | Rau dền | a bundle of red amaranth greens (rau dền đỏ) with deep red-purple leaves |
| `mong-toi.jpg` | Mồng tơi | a bunch of Malabar spinach (rau mồng tơi) with thick glossy dark-green leaves |
| `rau-lang.jpg` | Rau lang | young sweet potato leaves and shoots (rau lang) tied in a small bundle |
| `khoai-lang-mat.jpg` | Khoai lang mật | raw purple-skinned honey sweet potatoes (khoai lang mật) with dirt still on the skin |
| `ca-rot.jpg` | Cà rốt | a bundle of fresh orange carrots (cà rốt) with green leafy tops |
| `cu-den.jpg` | Củ dền | raw red beets (củ dền) with soil still clinging to the skin |
| `khoai-mon.jpg` | Khoai môn | raw taro roots (khoai môn) with rough brown skin |
| `cu-cai-trang.jpg` | Củ cải trắng | fresh white radishes (củ cải trắng) with green tops |
| `gung-tuoi.jpg` | Gừng tươi | fresh ginger roots (gừng tươi) with beige knobby skin |
| `hung-que.jpg` | Húng quế | a bundle of Thai basil (húng quế) with purple stems and fragrant green leaves |
| `rau-ram.jpg` | Rau răm | a small bundle of Vietnamese coriander (rau răm) |
| `ngo-gai.jpg` | Ngò gai | a bundle of sawtooth coriander / culantro leaves (ngò gai) |
| `sa-cay.jpg` | Sả cây | a bundle of fresh lemongrass stalks (sả cây) |
| `tia-to.jpg` | Tía tô | a bundle of purple-backed perilla leaves (tía tô) |
| `diep-ca.jpg` | Diếp cá | a small bundle of fish mint leaves (diếp cá) |
| `xa-lach-lo-lo.jpg` | Xà lách lô lô | a head of frilly red-green lettuce (xà lách lô lô) |
| `cai-kale.jpg` | Cải kale | a bunch of dark green curly kale leaves (cải kale) |
| `bong-cai-xanh.jpg` | Bông cải xanh | a fresh head of broccoli (bông cải xanh) |

### Fruits

| Filename | Product | Subject |
|---|---|---|
| `buoi-da-xanh.jpg` | Bưởi da xanh | a whole green-skinned pomelo (bưởi da xanh) cut open showing pink flesh, next to a whole uncut one |
| `cam-sanh.jpg` | Cam sành | a pile of green-skinned Vietnamese king oranges (cam sành), one cut in half showing juicy orange flesh |
| `xoai-cat-hoa-loc.jpg` | Xoài cát Hoà Lộc | ripe golden-yellow Hoa Loc mangoes (xoài cát Hoà Lộc), one sliced open |
| `chuoi-su.jpg` | Chuối sứ | a hand of small ripe su bananas (chuối sứ) with yellow-brown speckled skin |
| `oi-nu-hoang.jpg` | Ổi nữ hoàng | green guavas (ổi nữ hoàng) with pale flesh, one cut in half |
| `du-du.jpg` | Đu đủ | a ripe papaya (đu đủ) cut in half showing orange flesh and black seeds |
| `ca-chua-bi.jpg` | Cà chua bi | a small basket of red cherry tomatoes (cà chua bi) with a few still on the vine |
| `ot-chuong.jpg` | Ớt chuông | a mix of red, yellow and green bell peppers (ớt chuông ba màu) |

### Eggs & dairy

| Filename | Product | Subject |
|---|---|---|
| `sua-tuoi-thanh-trung.jpg` | Sữa tươi thanh trùng | a glass bottle of fresh pasteurized milk with a few condensation droplets, rustic dairy-farm style |
| `sua-chua-nha-lam.jpg` | Sữa chua nhà làm | small glass jars of homemade yogurt (sữa chua) with a spoon |
| `pho-mai-tuoi.jpg` | Phô mai tươi | a round of fresh farmhouse cheese (phô mai tươi) on wax paper |
| `bo-lat.jpg` | Bơ lạt | a block of unsalted butter (bơ lạt) on a small wooden butter dish |
| `trung-ga-tha-vuon.jpg` | Trứng gà thả vườn | a carton of free-range chicken eggs (trứng gà thả vườn) with brown speckled shells |
| `trung-vit.jpg` | Trứng vịt | a carton of duck eggs (trứng vịt) with pale blue-green shells |
| `trung-cut.jpg` | Trứng cút | a small carton of tiny quail eggs (trứng cút) with speckled shells |
| `trung-ga-ac.jpg` | Trứng gà ác | a small carton of black-boned chicken eggs (trứng gà ác) with pale shells |

### Baked goods

| Filename | Product | Subject |
|---|---|---|
| `banh-mi-men-tu-nhien.jpg` | Bánh mì men tự nhiên | a rustic sourdough loaf (bánh mì men tự nhiên) with a crackled golden crust, sliced open showing an airy crumb |
| `banh-chuoi-nuong.jpg` | Bánh chuối nướng | sliced baked banana cake (bánh chuối nướng) with caramelized banana on top, on a plate |
| `banh-quy-bo.jpg` | Bánh quy bơ | a stack of golden butter cookies (bánh quy bơ) in an open tin box |
| `banh-bong-lan-trung-muoi.jpg` | Bánh bông lan trứng muối | a salted-egg sponge cake (bánh bông lan trứng muối) sliced to show a fluffy yellow interior |
| `banh-mi-den.jpg` | Bánh mì đen | a dark rye bread loaf (bánh mì đen) with a dense crumb, sliced |

### Mushrooms

| Filename | Product | Subject |
|---|---|---|
| `nam-bao-ngu.jpg` | Nấm bào ngư | fresh grey oyster mushrooms (nấm bào ngư xám) in a small bamboo basket |
| `nam-moi-den.jpg` | Nấm mối đen | dark termite mushrooms (nấm mối đen), a rare delicacy, on a small plate |
| `nam-rom.jpg` | Nấm rơm | fresh straw mushrooms (nấm rơm) in a bamboo basket |
| `nam-dong-co-tuoi.jpg` | Nấm đông cô tươi | fresh shiitake mushrooms (nấm đông cô tươi) with brown caps |
| `nam-kim-cham.jpg` | Nấm kim châm | a bundle of enoki mushrooms (nấm kim châm) with long thin white stems |

### Honey & bee products (grains_beans_and_nuts)

| Filename | Product | Subject |
|---|---|---|
| `mat-ong-rung-tram.jpg` | Mật ong rừng tràm | a glass jar of dark wild Melaleuca honey (mật ong rừng tràm) with a honey dipper, thick and amber |
| `phan-hoa.jpg` | Phấn hoa | a small jar of golden bee pollen granules (phấn hoa) |
| `sap-ong-nguyen-chat.jpg` | Sáp ong nguyên chất | a block of pure raw beeswax (sáp ong nguyên chất) on a wooden plate |
| `mat-ong-hoa-nhan.jpg` | Mật ong hoa nhãn | a glass jar of light golden longan-flower honey (mật ong hoa nhãn) with a honey dipper |

## Extended seed products (41)

The stalls `db/seed-extended.sql` adds (`farmer11@` … `farmer20@`). Same product wrapper as above, only the
`{subject}` changes. `scripts/generate-seed.js` picks a file up by its name: until it exists, the product shows the
"temporary" photo in the last column, or no photo (the card then shows the category name). After adding files, run
`node scripts/generate-seed.js`, reload `db/seed-extended.sql` (`make seed-extended`) and copy the photos
(`make seed-images`).

| Filename | Product | Subject | Temporary |
|---|---|---|---|
| `rau-cai-bo-xoi.jpg` | Rau cải bó xôi | a bunch of fresh young spinach (cải bó xôi) with dark green, slightly crinkled leaves and pink-tinged stems | `cai-kale` |
| `xa-lach-iceberg.jpg` | Rau xà lách Iceberg | two round heads of crisp iceberg lettuce, one cut in half to show the pale tightly packed leaves | `xa-lach-lo-lo` |
| `cai-thia.jpg` | Cải thìa | several heads of baby bok choy (cải thìa) with white spoon-shaped stems and glossy green leaves | `cai-ngot` |
| `rau-ma.jpg` | Rau má | a bundle of fresh centella / pennywort (rau má) with small round scalloped leaves on thin stems | — |
| `chom-chom.jpg` | Chôm chôm | a pile of bright red rambutans (chôm chôm) with green-tipped hairy skins, one peeled to show the white flesh | — |
| `man-an-phuoc.jpg` | Mận An Phước | glossy bell-shaped pinkish-red Java rose apples (mận An Phước), one sliced to show the white crisp flesh | — |
| `nhan-long.jpg` | Nhãn lồng | bunches of longan fruit (nhãn lồng) on their stems with tan skins, one peeled to show the translucent flesh | — |
| `mang-cut.jpg` | Măng cụt | deep purple mangosteens (măng cụt) with green crowns, one opened to show the white segments | — |
| `vu-sua.jpg` | Vú sữa | round glossy purple-green star apples (vú sữa Lò Rèn), one cut across to show the milky star-shaped center | — |
| `tom-su.jpg` | Tôm sú | fresh raw black tiger prawns (tôm sú) with striped shells on crushed ice in a bamboo tray | — |
| `ca-thu.jpg` | Cá thu | sun-dried "one-sun" Spanish mackerel steaks (cá thu một nắng) with silver skin, arranged on banana leaf | — |
| `muc-ong.jpg` | Mực ống | fresh whole squid (mực ống) with translucent mottled skin on crushed ice | — |
| `ngheu.jpg` | Nghêu | a basket of fresh live clams (nghêu lụa) with smooth cream-and-brown striped shells, slightly wet | — |
| `ga-ta-nguyen-con.jpg` | Gà ta nguyên con | a whole cleaned free-range Vietnamese chicken (gà ta) with yellow skin, raw, on banana leaf | — |
| `vit-co.jpg` | Vịt cỏ | a whole cleaned raw field duck (vịt cỏ) on banana leaf, pale skin, trussed with string | — |
| `uc-ga.jpg` | Ức gà | fresh boneless skinless raw chicken breasts (ức gà) neatly arranged on a wooden board | — |
| `trung-ga-ta.jpg` | Trứng gà ta | a paper tray of 30 small light-brown free-range chicken eggs (trứng gà ta) | `trung-ga-tha-vuon` |
| `dau-phong-rang.jpg` | Đậu phộng rang | roasted peanuts with red skins tossed with fried garlic and chili (đậu phộng rang tỏi ớt) in a clay bowl | — |
| `hat-dieu-rang-muoi.jpg` | Hạt điều rang muối | salted roasted cashew nuts (hạt điều rang muối), some still in their thin brown skins, in a woven basket | — |
| `ca-phe-rang-xay.jpg` | Cà phê rang xay | a kraft paper bag of dark roasted ground Robusta coffee (cà phê rang xay) with whole beans and a phin filter beside it | — |
| `gao-st25.jpg` | Gạo ST25 | a burlap sack of long-grain fragrant ST25 rice (gạo ST25) with a wooden scoop of white rice in front | — |
| `dau-den.jpg` | Đậu đen | dried black beans with green centers (đậu đen xanh lòng) in a small woven basket and scattered on the table | — |
| `banh-flan-caramel.jpg` | Bánh flan caramel | small glass jars of Vietnamese caramel flan (bánh flan) with a glossy dark caramel top, one spooned open | — |
| `che-khuc-bach.jpg` | Chè khúc bạch | a glass jar of chè khúc bạch: white milk-jelly cubes with lychees and toasted almond slices in clear syrup | — |
| `banh-tiramisu.jpg` | Bánh tiramisu hộp | a clear takeaway box of tiramisu for two, dusted with cocoa powder, one corner cut to show the layers | — |
| `cookies-socola.jpg` | Cookies socola | a glass jar and a small stack of chocolate chip butter cookies (cookies socola), golden edges | `banh-quy-bo` |
| `nam-linh-chi-do.jpg` | Nấm linh chi đỏ | dried glossy red-brown reishi mushrooms (nấm linh chi đỏ), a few whole caps and some slices | — |
| `nam-huong-kho.jpg` | Nấm hương khô | dried shiitake mushrooms (nấm hương khô) with cracked brown caps in a bamboo basket | `nam-dong-co-tuoi` |
| `nam-dui-ga.jpg` | Nấm đùi gà | fresh king oyster mushrooms (nấm đùi gà) with thick white stems and small brown caps | `nam-bao-ngu` |
| `sup-lo-trang.jpg` | Súp lơ trắng | a large fresh white cauliflower head (súp lơ trắng) wrapped in its green leaves, one floret broken off | `bong-cai-xanh` |
| `atiso.jpg` | Atiso | fresh green globe artichokes (atiso Đà Lạt) with tight layered bracts, one cut in half | — |
| `bap-cai-tim.jpg` | Bắp cải tím | a head of purple cabbage (bắp cải tím), one half cut to show the violet-and-white inner layers | — |
| `ca-rot-baby.jpg` | Cà rốt baby | a bundle of baby carrots (cà rốt baby) with their feathery green tops, washed and bright orange | `ca-rot` |
| `dau-ha-lan.jpg` | Đậu Hà Lan | fresh green pea pods (đậu Hà Lan), some split open to show the round sweet peas | — |
| `sua-de-tuoi.jpg` | Sữa dê tươi | glass bottles of fresh pasteurised goat milk (sữa dê tươi) with a small glass poured beside them | `sua-tuoi-thanh-trung` |
| `sua-chua-de.jpg` | Sữa chua dê | small glass jars of plain goat-milk yogurt (sữa chua dê), one open with a wooden spoon | `sua-chua-nha-lam` |
| `pho-mai-de.jpg` | Phô mai dê | a small round of fresh white goat cheese (phô mai dê) with a slice cut, herbs beside it | `pho-mai-tuoi` |
| `kho-ca-loc.jpg` | Khô cá lóc | split sun-dried snakehead fish (khô cá lóc) with golden flesh, laid flat on a woven tray | — |
| `kho-ca-sac.jpg` | Khô cá sặc | small whole sun-dried snakeskin gourami (khô cá sặc) with silvery skin, fanned out on a bamboo tray | — |
| `mam-ca-linh.jpg` | Mắm cá linh | a glass jar of Mekong fermented linh fish (mắm cá linh) in brown brine, with sliced chilies | — |
| `tom-kho.jpg` | Tôm khô | bright orange-red dried shrimp (tôm khô Cà Mau) in a small bamboo basket and scattered on the table | — |
