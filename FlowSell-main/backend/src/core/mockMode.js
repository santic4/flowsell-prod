import { config, LEGAL_VERSION, PLANS, SUPPORT_PHONE } from './config.js';
import { createSalesCsv, validateDateRange } from '../services/statisticsServices.js';

const MOCK_ACCOUNT_ID = '65f0a0000000000000000001';
const MOCK_JOB_ID = '550e8400-e29b-41d4-a716-446655440000';
const DAY_MS = 86400000;

const svgThumbnail = (label, accent = '#3483fa') => {
  const safe = String(label || 'FS').slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="26" fill="#f6f8fb"/><circle cx="120" cy="120" r="66" fill="${accent}" opacity="0.14"/><rect x="68" y="78" width="104" height="84" rx="16" fill="white" stroke="${accent}" stroke-width="5"/><text x="120" y="132" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="${accent}">${safe || 'FS'}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};


const xml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// Las imágenes MOCK son SVG embebidos como data: URL.
// Esto evita depender de hosts externos y funciona con la CSP actual de Flow Sell,
// que ya permite img-src data:. No se guarda ningún archivo de imagen en el proyecto.
const productMockImage = (title, accent = '#3483fa', index = 0) => {
  const t = String(title || '').toLowerCase();
  const dark = '#172033';
  const soft = '#eef4ff';
  const white = '#ffffff';
  const muted = '#7b8aa0';

  let art = '';
  if (t.includes('auricular')) {
    art = `<path d="M74 130v-12c0-34 20-57 46-57s46 23 46 57v12" fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round"/><rect x="61" y="118" width="31" height="61" rx="14" fill="${accent}"/><rect x="148" y="118" width="31" height="61" rx="14" fill="${accent}"/><rect x="70" y="132" width="12" height="32" rx="6" fill="${white}" opacity=".8"/><rect x="157" y="132" width="12" height="32" rx="6" fill="${white}" opacity=".8"/>`;
  } else if (t.includes('notebook') && (t.includes('soporte') || t.includes('stand') || t.includes('base'))) {
    art = `<rect x="63" y="62" width="114" height="72" rx="7" fill="${dark}"/><rect x="71" y="70" width="98" height="55" rx="3" fill="${soft}"/><path d="M87 149h66l22 24H65z" fill="${accent}"/><path d="M98 144l-15 29M142 144l15 29" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (t.includes('mouse')) {
    art = `<path d="M120 57c29 0 50 23 50 55v28c0 35-21 55-50 55s-50-20-50-55v-28c0-32 21-55 50-55z" fill="${dark}"/><path d="M120 58v48" stroke="${white}" stroke-width="4" opacity=".75"/><rect x="114" y="76" width="12" height="25" rx="6" fill="${accent}"/>`;
  } else if (t.includes('teclado')) {
    art = `<rect x="48" y="79" width="144" height="92" rx="13" fill="${dark}"/><g fill="${soft}">${Array.from({length:5},(_,r)=>Array.from({length:10},(_,c)=>`<rect x="${58+c*13}" y="${90+r*14}" width="9" height="9" rx="2"/>`).join('')).join('')}</g><rect x="84" y="146" width="72" height="9" rx="4" fill="${accent}"/>`;
  } else if (t.includes('lámpara') || t.includes('lampara')) {
    art = `<path d="M95 74h50l22 45H73z" fill="${accent}"/><rect x="115" y="118" width="10" height="52" rx="5" fill="${dark}"/><rect x="86" y="169" width="68" height="12" rx="6" fill="${dark}"/><circle cx="120" cy="97" r="12" fill="${white}" opacity=".85"/>`;
  } else if (t.includes('cargador') && !t.includes('inalámbrico') && !t.includes('inalambrico')) {
    art = `<rect x="82" y="67" width="76" height="99" rx="18" fill="${dark}"/><rect x="104" y="47" width="10" height="28" rx="4" fill="${muted}"/><rect x="126" y="47" width="10" height="28" rx="4" fill="${muted}"/><rect x="104" y="139" width="32" height="8" rx="4" fill="${accent}"/><path d="M126 88l-19 28h17l-9 25 25-34h-17z" fill="${accent}"/>`;
  } else if (t.includes('hub') || t.includes('lector de tarjetas')) {
    art = `<rect x="58" y="91" width="124" height="58" rx="15" fill="${dark}"/><rect x="72" y="105" width="19" height="11" rx="3" fill="${accent}"/><rect x="98" y="105" width="19" height="11" rx="3" fill="${soft}"/><rect x="124" y="105" width="19" height="11" rx="3" fill="${soft}"/><rect x="150" y="105" width="18" height="29" rx="4" fill="${accent}"/><path d="M182 120h25" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (t.includes('webcam')) {
    art = `<rect x="58" y="78" width="124" height="79" rx="17" fill="${dark}"/><circle cx="120" cy="117" r="27" fill="${accent}"/><circle cx="120" cy="117" r="13" fill="${soft}"/><circle cx="129" cy="108" r="4" fill="${white}"/><rect x="105" y="157" width="30" height="15" rx="5" fill="${dark}"/><rect x="86" y="170" width="68" height="9" rx="4" fill="${dark}"/>`;
  } else if (t.includes('parlante')) {
    art = `<rect x="74" y="55" width="92" height="132" rx="22" fill="${dark}"/><circle cx="120" cy="92" r="24" fill="${soft}"/><circle cx="120" cy="145" r="31" fill="${accent}"/><circle cx="120" cy="145" r="14" fill="${dark}" opacity=".45"/>`;
  } else if (t.includes('power bank')) {
    art = `<rect x="76" y="61" width="88" height="126" rx="18" fill="${dark}"/><rect x="93" y="81" width="54" height="11" rx="5" fill="${accent}"/><path d="M126 105l-24 37h20l-8 24 28-39h-20z" fill="${accent}"/>`;
  } else if (t.includes('cable') || t.includes('extensión') || t.includes('extension')) {
    art = `<path d="M74 84c0 33 92 13 92 51 0 28-28 41-51 41-20 0-39-10-39-31 0-16 14-27 30-27" fill="none" stroke="${dark}" stroke-width="12" stroke-linecap="round"/><rect x="58" y="66" width="34" height="26" rx="6" fill="${accent}"/><rect x="151" y="128" width="34" height="26" rx="6" fill="${accent}"/>`;
  } else if (t.includes('refrigerante')) {
    art = `<path d="M61 88h118l-15 87H76z" fill="${dark}"/><circle cx="101" cy="130" r="27" fill="${soft}"/><circle cx="139" cy="130" r="27" fill="${soft}"/><path d="M101 108v44M79 130h44M139 108v44M117 130h44" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`;
  } else if (t.includes('organizador de cables') || t.includes('organizador')) {
    art = `<rect x="62" y="76" width="116" height="98" rx="20" fill="${soft}" stroke="${dark}" stroke-width="7"/><path d="M82 101h76M82 125h76M82 149h50" stroke="${accent}" stroke-width="9" stroke-linecap="round"/><circle cx="155" cy="149" r="10" fill="${dark}"/>`;
  } else if (t.includes('trípode') || t.includes('tripode')) {
    art = `<rect x="97" y="58" width="46" height="67" rx="10" fill="${dark}"/><rect x="104" y="66" width="32" height="50" rx="4" fill="${soft}"/><path d="M120 124v21M120 145l-40 39M120 145l40 39M120 145v42" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (t.includes('aro de luz')) {
    art = `<circle cx="120" cy="96" r="47" fill="none" stroke="${accent}" stroke-width="14"/><rect x="105" y="72" width="30" height="49" rx="7" fill="${dark}"/><path d="M120 143v42M120 159l-28 28M120 159l28 28" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (t.includes('funda') || t.includes('mochila')) {
    art = `<path d="M84 81c0-19 15-34 36-34s36 15 36 34v9h14v94H70V90h14z" fill="${dark}"/><path d="M98 81c0-12 10-22 22-22s22 10 22 22" fill="none" stroke="${accent}" stroke-width="8"/><rect x="90" y="111" width="60" height="46" rx="10" fill="${accent}" opacity=".85"/>`;
  } else if (t.includes('adaptador') || t.includes('bluetooth')) {
    art = `<rect x="76" y="86" width="88" height="66" rx="15" fill="${dark}"/><rect x="164" y="101" width="25" height="36" rx="5" fill="${accent}"/><path d="M112 101l23 18-23 18v-36zm0 0l-15 14m15 22l-15-14" fill="none" stroke="${accent}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  } else if (t.includes('micrófono') || t.includes('microfono')) {
    art = `<rect x="95" y="54" width="50" height="91" rx="25" fill="${dark}"/><path d="M79 116c0 29 17 48 41 48s41-19 41-48" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round"/><path d="M120 165v20M94 185h52" stroke="${dark}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (t.includes('control remoto')) {
    art = `<rect x="91" y="47" width="58" height="143" rx="24" fill="${dark}"/><circle cx="120" cy="78" r="12" fill="${accent}"/><circle cx="106" cy="111" r="7" fill="${soft}"/><circle cx="134" cy="111" r="7" fill="${soft}"/><rect x="104" y="137" width="32" height="9" rx="4" fill="${accent}"/>`;
  } else if (t.includes('limpieza')) {
    art = `<rect x="73" y="78" width="94" height="101" rx="18" fill="${dark}"/><rect x="92" y="54" width="56" height="28" rx="10" fill="${accent}"/><path d="M94 105h52M94 127h52M94 149h33" stroke="${soft}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (t.includes('alfombrilla') || t.includes('muñeca') || t.includes('muneca')) {
    art = `<rect x="48" y="86" width="144" height="87" rx="19" fill="${dark}"/><path d="M68 150c29-39 68-39 103 0" fill="none" stroke="${accent}" stroke-width="11" stroke-linecap="round"/>`;
  } else if (t.includes('inalámbrico 15w') || t.includes('inalambrico 15w')) {
    art = `<ellipse cx="120" cy="136" rx="61" ry="35" fill="${dark}"/><ellipse cx="120" cy="126" rx="52" ry="29" fill="${soft}"/><path d="M126 91l-23 34h20l-9 25 29-39h-20z" fill="${accent}"/>`;
  } else if (t.includes('protector de tensión') || t.includes('protector de tension')) {
    art = `<rect x="58" y="92" width="124" height="71" rx="18" fill="${dark}"/><g fill="${soft}"><circle cx="82" cy="120" r="10"/><circle cx="110" cy="120" r="10"/><circle cx="138" cy="120" r="10"/></g><rect x="155" y="109" width="14" height="25" rx="4" fill="${accent}"/>`;
  } else if (t.includes('monitor')) {
    art = `<rect x="48" y="60" width="63" height="78" rx="8" fill="${dark}"/><rect x="129" y="60" width="63" height="78" rx="8" fill="${dark}"/><rect x="57" y="69" width="45" height="57" rx="3" fill="${soft}"/><rect x="138" y="69" width="45" height="57" rx="3" fill="${soft}"/><path d="M120 83v82M92 165h56" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (t.includes('balanza')) {
    art = `<rect x="64" y="80" width="112" height="101" rx="22" fill="${dark}"/><rect x="88" y="100" width="64" height="34" rx="7" fill="${soft}"/><text x="120" y="125" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="${accent}">0.000</text>`;
  } else if (t.includes('termómetro') || t.includes('termometro')) {
    art = `<rect x="105" y="48" width="30" height="105" rx="15" fill="${dark}"/><circle cx="120" cy="166" r="27" fill="${accent}"/><rect x="115" y="70" width="10" height="86" rx="5" fill="${accent}"/>`;
  } else if (t.includes('botella')) {
    art = `<rect x="98" y="48" width="44" height="27" rx="8" fill="${dark}"/><path d="M91 82c0-9 7-16 16-16h26c9 0 16 7 16 16v92c0 10-8 18-18 18h-22c-10 0-18-8-18-18z" fill="${accent}"/><path d="M106 91h28" stroke="${white}" stroke-width="7" stroke-linecap="round" opacity=".75"/>`;
  } else {
    art = `<rect x="68" y="70" width="104" height="104" rx="24" fill="${dark}"/><circle cx="120" cy="122" r="35" fill="${accent}"/><path d="M102 122l12 12 27-31" fill="none" stroke="${white}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const short = title
    .replace(/\b(con|para|de|y|x\d+)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 240 210">
    <defs>
      <linearGradient id="bg${index}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#e8f0fb"/>
      </linearGradient>
    </defs>
    <rect width="240" height="210" rx="22" fill="url(#bg${index})"/>
    <circle cx="201" cy="27" r="30" fill="${accent}" opacity=".08"/>
    <circle cx="31" cy="178" r="43" fill="${accent}" opacity=".06"/>
    ${art}
    <rect x="54" y="190" width="132" height="1" fill="#dce5f0"/>
    <text x="120" y="203" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="8.8" font-weight="700" fill="#516174">${xml(short)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Fotos reales y públicas para las publicaciones MOCK.
// Pexels sirve las imágenes desde images.pexels.com; no se descarga ni guarda ningún archivo local.
const publicProductImage = (photoId) =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=900&h=560&fit=crop`;

// El orden coincide 1:1 con PRODUCT_SEED.
const PRODUCT_IMAGE_IDS = [
  12799296, // Auriculares Bluetooth Inalámbricos Pro
  4792717,  // Soporte Notebook Aluminio Regulable
  13870516, // Mouse Inalámbrico Ergonómico USB-C
  32755765, // Teclado Mecánico Compacto RGB
  7439757,  // Lámpara LED Escritorio con USB
  3921700,  // Cargador Rápido 30W USB-C
  7054723,  // Hub USB-C 7 en 1 HDMI
  7172701,  // Webcam Full HD con Micrófono
  5511714,  // Parlante Bluetooth Portátil
  3921704,  // Power Bank 20.000 mAh Carga Rápida
  3921713,  // Cable USB-C Reforzado 2 Metros
  968631,   // Base Refrigerante para Notebook
  4763075,  // Organizador de Cables para Escritorio
  14541010, // Mini Trípode Flexible para Celular
  4793156,  // Aro de Luz LED 26 cm con Trípode
  9407362,  // Funda Notebook 15.6 Impermeable
  3921630,  // Adaptador HDMI a USB-C 4K
  31575852, // Micrófono USB Condensador Streaming
  33072751, // Control Remoto Bluetooth para Celular
  4792717,  // Stand Vertical para Notebook
  31854231, // Kit Limpieza Electrónica 8 en 1
  27559488, // Alfombrilla XL para Escritorio
  3921696,  // Adaptador Bluetooth 5.3 USB
  3921713,  // Cable HDMI 2.1 2 Metros
  33072751, // Soporte Celular para Escritorio
  7742584,  // Cargador Inalámbrico 15W
  7054799,  // Mochila Urbana para Notebook 15.6
  7054723,  // Lector de Tarjetas USB-C SD MicroSD
  3921713,  // Extensión USB 3.0 1.5 Metros
  18358118, // Protector de Tensión 6 Tomas USB
  27559487, // Apoya Muñeca Ergonómico Teclado
  27559483, // Soporte Doble Monitor de Escritorio
  6303718,  // Balanza Digital Cocina 10 kg
  6035322,  // Termómetro Digital Infrarrojo Cocina
  7879832,  // Botella Térmica Acero 750 ml
  18999368, // Set Organizadores de Viaje x6
];

const PRODUCT_SEED = [
  ['Auriculares Bluetooth Inalámbricos Pro', 38990, 428, 12, 'AU'],
  ['Soporte Notebook Aluminio Regulable', 31990, 316, 0, 'SN'],
  ['Mouse Inalámbrico Ergonómico USB-C', 22990, 511, 0, 'MI'],
  ['Teclado Mecánico Compacto RGB', 64990, 247, 6, 'TM'],
  ['Lámpara LED Escritorio con USB', 27990, 392, 0, 'LE'],
  ['Cargador Rápido 30W USB-C', 24990, 603, 0, 'CR'],
  ['Hub USB-C 7 en 1 HDMI', 56990, 204, 0, 'HU'],
  ['Webcam Full HD con Micrófono', 44990, 289, 0, 'WF'],
  ['Parlante Bluetooth Portátil', 35990, 466, 5, 'PB'],
  ['Power Bank 20.000 mAh Carga Rápida', 52990, 351, 0, 'PB'],
  ['Cable USB-C Reforzado 2 Metros', 12990, 788, 4, 'CU'],
  ['Base Refrigerante para Notebook', 41990, 173, 0, 'BR'],
  ['Organizador de Cables para Escritorio', 14990, 642, 3, 'OC'],
  ['Mini Trípode Flexible para Celular', 18990, 334, 0, 'MT'],
  ['Aro de Luz LED 26 cm con Trípode', 34990, 271, 0, 'AL'],
  ['Funda Notebook 15.6 Impermeable', 25990, 455, 4, 'FN'],
  ['Adaptador HDMI a USB-C 4K', 29990, 298, 0, 'AH'],
  ['Micrófono USB Condensador Streaming', 78990, 126, 0, 'MU'],
  ['Control Remoto Bluetooth para Celular', 15990, 542, 0, 'CB'],
  ['Stand Vertical para Notebook', 36990, 188, 0, 'SV'],
  ['Kit Limpieza Electrónica 8 en 1', 19990, 479, 0, 'KL'],
  ['Alfombrilla XL para Escritorio', 28990, 361, 3, 'AX'],
  ['Adaptador Bluetooth 5.3 USB', 17990, 624, 0, 'AB'],
  ['Cable HDMI 2.1 2 Metros', 21990, 517, 0, 'CH'],
  ['Soporte Celular para Escritorio', 16990, 693, 5, 'SC'],
  ['Cargador Inalámbrico 15W', 26990, 338, 0, 'CI'],
  ['Mochila Urbana para Notebook 15.6', 58990, 219, 4, 'MN'],
  ['Lector de Tarjetas USB-C SD MicroSD', 23990, 307, 0, 'LT'],
  ['Extensión USB 3.0 1.5 Metros', 13990, 401, 0, 'EU'],
  ['Protector de Tensión 6 Tomas USB', 46990, 255, 0, 'PT'],
  ['Apoya Muñeca Ergonómico Teclado', 18990, 284, 0, 'AM'],
  ['Soporte Doble Monitor de Escritorio', 94990, 97, 0, 'SD'],
  ['Balanza Digital Cocina 10 kg', 24990, 372, 0, 'BD'],
  ['Termómetro Digital Infrarrojo Cocina', 32990, 164, 0, 'TD'],
  ['Botella Térmica Acero 750 ml', 29990, 436, 6, 'BT'],
  ['Set Organizadores de Viaje x6', 27990, 348, 4, 'SO'],
];

const ACCENTS = ['#3483fa', '#7c3aed', '#0f766e', '#d97706', '#2563eb', '#475569'];

export const mockProducts = PRODUCT_SEED.map(([title, price, sold, variationCount, initials], index) => {
  const id = `MLA14500${String(index + 1).padStart(5, '0')}`;
  const variations = variationCount
    ? Array.from({ length: Math.min(variationCount, 4) }, (_, variantIndex) => ({
        id: String(7300000000 + index * 10 + variantIndex),
        attribute_combinations: [
          { name: index % 2 ? 'Color' : 'Modelo', value_name: ['Negro', 'Blanco', 'Gris', 'Azul'][variantIndex % 4] },
        ],
        available_quantity: 8 + ((index + variantIndex) % 17),
        price: price + variantIndex * 2500,
      }))
    : [];
  return {
    id,
    title,
    thumbnail: publicProductImage(PRODUCT_IMAGE_IDS[index]),
    secure_thumbnail: publicProductImage(PRODUCT_IMAGE_IDS[index]),
    status: index === 9 || index === 27 ? 'paused' : 'active',
    available_quantity: 14 + ((index * 7) % 48),
    sold_quantity: sold,
    price,
    currency_id: 'ARS',
    permalink: `https://articulo.mercadolibre.com.ar/${id}`,
    variations,
  };
});

const TEMPLATE_SEED = [
  ['Gracias por tu compra', '¡Hola! Gracias por elegirnos. Ya recibimos tu compra y estamos preparando todo para que avance correctamente.'],
  ['Confirmación de pedido', 'Tu pedido quedó confirmado. Si necesitás aclarar algún detalle de la compra, podés responder este mensaje.'],
  ['Información de despacho', 'Estamos preparando el despacho. Vas a poder seguir las novedades desde el detalle de tu compra en Mercado Libre.'],
  ['Seguimiento posventa', '¿Cómo estás? Queríamos confirmar que todo haya llegado bien. Si necesitás ayuda con el producto, escribinos por acá.'],
  ['Guía de uso', 'Gracias por tu compra. Te compartimos una recomendación rápida para que puedas empezar a usar el producto sin complicaciones.'],
  ['Recordatorio de instalación', 'Antes de usar el producto, revisá las indicaciones de instalación. Si algo no coincide, consultanos y te ayudamos.'],
  ['Atención ante inconvenientes', 'Si tuviste algún inconveniente, contanos qué pasó antes de iniciar otro trámite. Vamos a intentar ayudarte lo antes posible.'],
  ['Mensaje para compra con variante', 'Recibimos tu compra y verificamos la variante seleccionada. Si necesitás confirmar color o modelo, respondé este mensaje.'],
  ['Cierre de posventa', 'Gracias nuevamente por tu compra. Esperamos que el producto haya cumplido tus expectativas. Quedamos disponibles ante cualquier consulta.'],
];

export const mockTemplates = TEMPLATE_SEED.map(([name, content], index) => ({
  _id: `64f1000000000000000000${String(index + 1).padStart(2, '0')}`,
  name,
  content,
  assignedPublications: mockProducts.slice(index, index + 6 + (index % 4)).map((product) => product.title),
  attachments: [],
  legacyAttachments: 0,
  createdAt: new Date(Date.UTC(2026, 5, 3 + index)).toISOString(),
  updatedAt: new Date(Date.UTC(2026, 7, 12 + index)).toISOString(),
}));

const templateRef = (index) => ({ templateId: mockTemplates[index]._id, name: mockTemplates[index].name });

export const mockSavedProducts = mockProducts.slice(0, 18).map((product, index) => {
  const hasVariations = product.variations.length > 0 && index % 3 === 0;
  const primaryTemplates = [templateRef(index % 4), templateRef((index + 3) % 7)];
  return {
    _id: `66a2000000000000000000${String(index + 1).padStart(2, '0')}`,
    id: product.id,
    title: product.title,
    site_id: 'MLA',
    templates: hasVariations ? [] : primaryTemplates,
    variations: hasVariations
      ? product.variations.slice(0, 3).map((variation, variationIndex) => ({
          id: String(variation.id),
          name: variation.attribute_combinations.map((attribute) => attribute.value_name).join(' / '),
          templates: [templateRef((index + variationIndex) % 5), templateRef((index + variationIndex + 4) % 8)],
        }))
      : [],
    secondMessages: index % 3 === 0 ? [templateRef(3)] : index % 5 === 0 ? [templateRef(8)] : [],
    secondMessageDelay: [12, 18, 24, 36][index % 4],
    enabled: index !== 7 && index !== 15,
    markDelivered: index === 4 || index === 11,
    effectiveActive: index !== 7 && index !== 15,
    createdAt: new Date(Date.UTC(2026, 4, 10 + index)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 7, 15 + (index % 12))).toISOString(),
  };
});

const utcDate = (value) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (date) => date.toISOString().slice(0, 10);
const dayOrdinal = (date) => Math.floor(date.getTime() / DAY_MS);

const dailyOrders = (date) => {
  const ordinal = dayOrdinal(date);
  const variation = ((ordinal * 17) % 9) - 4;
  const weekday = date.getUTCDay();
  const weekendAdjustment = weekday === 6 ? -5 : weekday === 0 ? -8 : 0;
  return 58 + variation + weekendAdjustment;
};

const averageTicketFor = (date) => {
  const ordinal = dayOrdinal(date);
  return 28500 + ((ordinal * 7919) % 8500);
};

const unitsFor = (orders, date) => orders + Math.round(orders * (0.14 + ((dayOrdinal(date) % 5) * 0.015)));

const productForOrdinal = (ordinal) => mockProducts[Math.abs(ordinal) % 12];

export function createMockSalesReport(from, to) {
  const range = validateDateRange(from, to);
  const timeline = [];
  let totalRevenue = 0;
  let orders = 0;
  let units = 0;

  const cursor = utcDate(range.from);
  const last = utcDate(range.to);
  while (cursor <= last) {
    const dayOrders = dailyOrders(cursor);
    const averageTicket = averageTicketFor(cursor);
    const dayRevenue = Math.round(dayOrders * averageTicket);
    const dayUnits = unitsFor(dayOrders, cursor);
    timeline.push({ date: dateKey(cursor), revenue: dayRevenue, orders: dayOrders, units: dayUnits });
    totalRevenue += dayRevenue;
    orders += dayOrders;
    units += dayUnits;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weights = [0.14, 0.115, 0.092, 0.078, 0.067, 0.059, 0.051, 0.045];
  const topProducts = weights.map((weight, index) => {
    const product = mockProducts[index];
    const revenue = Math.round(totalRevenue * weight);
    const quantity = Math.max(1, Math.round(revenue / product.price));
    return {
      itemId: product.id,
      title: product.title,
      quantity,
      orders: Math.max(1, Math.round(quantity * 0.92)),
      revenue,
    };
  });

  const recentOrders = [];
  let recentDate = utcDate(range.to);
  for (let index = 0; index < 16; index += 1) {
    if (recentDate < utcDate(range.from)) break;
    const ordinal = dayOrdinal(recentDate) - index;
    const product = productForOrdinal(ordinal);
    const quantity = index % 6 === 0 ? 2 : 1;
    const total = product.price * quantity;
    recentOrders.push({
      orderId: String(200000000000 + Math.abs(ordinal * 97) + index),
      date: new Date(recentDate.getTime() + (18 - (index % 9)) * 3600000).toISOString(),
      buyerId: String(90000000 + Math.abs(ordinal * 13) + index),
      buyerNickname: ['comprador_norte', 'lucas.store', 'mari_g', 'tomas.ar', 'vale_online', 'nico_ventas'][index % 6],
      itemsCount: quantity,
      items: [{ itemId: product.id, title: product.title, quantity }],
      total,
      currencyId: 'ARS',
      status: 'paid',
    });
    if (index % 3 === 2) recentDate = new Date(recentDate.getTime() - DAY_MS);
  }

  const bestDay = timeline.reduce((best, day) => (!best || day.revenue > best.revenue ? day : best), null);
  return {
    summary: {
      totalRevenue,
      orders,
      units,
      averageTicket: orders ? Math.round(totalRevenue / orders) : 0,
      uniqueBuyers: Math.round(orders * 0.89),
      bestDay,
    },
    timeline,
    topProducts,
    recentOrders,
    meta: {
      ...range,
      currencyId: 'ARS',
      generatedAt: new Date().toISOString(),
      source: 'Mercado Libre',
    },
  };
}

const createMockOrders = (from, to) => {
  const range = validateDateRange(from, to);
  const orders = [];
  const cursor = utcDate(range.from);
  let serial = 0;
  while (cursor <= utcDate(range.to)) {
    const count = dailyOrders(cursor);
    for (let index = 0; index < count; index += 1) {
      const product = mockProducts[(dayOrdinal(cursor) + index * 3) % 12];
      const quantity = index % 8 === 0 ? 2 : 1;
      const unitPrice = product.price;
      orders.push({
        id: String(200000000000 + dayOrdinal(cursor) * 100 + index),
        date_created: new Date(cursor.getTime() + (8 + (index % 13)) * 3600000 + (index % 4) * 900000).toISOString(),
        status: 'paid',
        currency_id: 'ARS',
        buyer: { id: String(90000000 + serial), nickname: `comprador_${String((serial % 900) + 100)}` },
        total_amount: unitPrice * quantity,
        order_items: [{ item: { id: product.id, title: product.title }, quantity, unit_price: unitPrice, currency_id: 'ARS' }],
      });
      serial += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return orders;
};

export const createMockSalesCsv = (from, to) => createSalesCsv(createMockOrders(from, to));

export const mockActivity = Array.from({ length: 50 }, (_, index) => {
  const createdAt = new Date(Date.now() - index * 3.2 * 3600000);
  const status = index === 17 ? 'uncertain' : index === 31 ? 'failed' : 'sent';
  return {
    _id: `67b3000000000000000000${String(index + 1).padStart(2, '0')}`,
    orderId: String(200000000000 + 87000 - index * 13),
    phase: index % 9 === 0 ? 'campaign' : index % 4 === 0 ? 'delayed' : 'initial',
    status,
    reason: status === 'failed' ? 'PROVIDER_REJECTED' : '',
    createdAt: createdAt.toISOString(),
  };
});

const mockBuyers = Array.from({ length: 186 }, (_, index) => ({
  buyerId: String(88000000 + index * 7),
  nickname: ['martina_ok', 'facu1988', 'agus.shop', 'leo_online', 'carla.r', 'fede_store', 'sofi.ar'][index % 7] + (index > 6 ? String(index + 1) : ''),
  order_id: String(200000800000 + index * 11),
}));

export const mockCampaignJob = {
  jobId: MOCK_JOB_ID,
  status: 'COMPLETED',
  buyers: mockBuyers,
  statusMessagesMassive: 'COMPLETED',
  progress: { offset: 186, totalEstimate: 186, processedSoFar: 186, lastBatchId: 'mock-final', percent: 100, updatedAt: new Date().toISOString() },
  createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  completedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  itemIds: mockProducts.slice(0, 6).map((product) => product.id),
  sent: 186,
  failed: 0,
};

export function mockAccountPayload() {
  return {
    id: MOCK_ACCOUNT_ID,
    meliId: '123456789',
    nickname: 'Tienda Norte',
    email: 'ventas@tiendanorte.demo',
    picture: null,
    status: 'active',
    plan: { ...PLANS.premium },
    planExpiresAt: null,
    isAdmin: false,
    consentCurrent: true,
    legalVersion: LEGAL_VERSION,
    legalReady: true,
    usage: {
      templates: mockTemplates.length,
      flows: mockSavedProducts.length,
      storageBytes: 74 * 1024 * 1024,
      messages: 1084,
      campaigns: 2,
      month: new Date().toISOString().slice(0, 7),
    },
  };
}

const mockProductDetail = (id) => {
  const saved = mockSavedProducts.find((product) => product.id === id);
  if (saved) return saved;
  const product = mockProducts.find((item) => item.id === id);
  return product ? { id: product.id, title: product.title, site_id: 'MLA', templates: [], variations: [], secondMessages: [], secondMessageDelay: 24, enabled: true, markDelivered: false } : null;
};

export function mockOperationsMiddleware(req, res, next) {
  if (!config.mock) return next();
  const path = req.path;
  const method = req.method.toUpperCase();

  if (method === 'GET' && path === '/templates') return res.json(mockTemplates);
  if (method === 'POST' && path === '/templates') return res.status(201).json(mockTemplates[0]);
  if (method === 'PUT' && /^\/templates\/[a-f0-9]{24}$/i.test(path)) return res.json(mockTemplates[0]);
  if (method === 'DELETE' && /^\/templates\/[a-f0-9]{24}$/i.test(path)) return res.status(204).end();
  if (method === 'GET' && /^\/media\/[a-f0-9]{24}$/i.test(path)) {
    const svg = decodeURIComponent(svgThumbnail('FS').split(',')[1]);
    return res.type('image/svg+xml').send(svg);
  }

  if (method === 'GET' && path === '/products') {
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const items = mockProducts.slice(offset, offset + 50);
    return res.json({ items, total: mockProducts.length, nextOffset: offset + 50 < mockProducts.length ? offset + 50 : null });
  }
  if (method === 'GET' && path === '/products/saved') return res.json(mockSavedProducts);

  const templateMatch = path.match(/^\/products\/template\/(MLA\d+)$/i);
  if (method === 'GET' && templateMatch) {
    const product = mockProductDetail(templateMatch[1]);
    return product ? res.json(product) : res.status(404).json({ error: 'Flujo no encontrado.' });
  }

  const refetchMatch = path.match(/^\/products\/(MLA\d+)\/refetch-id$/i);
  if (method === 'GET' && refetchMatch) {
    const product = mockProducts.find((item) => item.id === refetchMatch[1]);
    return product ? res.json(product) : res.status(404).json({ error: 'Publicación no encontrada.' });
  }

  const productMutationMatch = path.match(/^\/products\/(MLA\d+)\/(assign-templates-modal|assign-delay)$/i);
  if (method === 'POST' && productMutationMatch) return res.json(mockProductDetail(productMutationMatch[1]) || { ok: true });
  if (method === 'PATCH' && /^\/products\/(MLA\d+)\/settings$/i.test(path)) return res.json(mockProductDetail(path.split('/')[2]) || { ok: true });
  if (method === 'POST' && /^\/templates\/[a-f0-9]{24}\/assign-second-messages$/i.test(path)) return res.json({ ok: true });
  if (method === 'POST' && path === '/products/assign-template-to-all') return res.json({ ok: true });
  if (method === 'PATCH' && /^\/products\/(MLA\d+)\/templates\/reorder$/i.test(path)) return res.json({ templates: mockProductDetail(path.split('/')[2])?.templates || [] });
  if (method === 'DELETE' && /^\/products\/(MLA\d+)\/(templates|second-template)\/[a-f0-9]{24}$/i.test(path)) return res.status(204).end();
  if (method === 'DELETE' && /^\/products\/(MLA\d+)\/saved-product$/i.test(path)) return res.status(204).end();

  if (method === 'GET' && path === '/statistics/sales') return res.json(createMockSalesReport(req.query.from, req.query.to));
  if (method === 'GET' && path === '/statistics/sales/export') {
    return res.attachment('flowsell-ventas-demo.csv').type('text/csv').send(createMockSalesCsv(req.query.from, req.query.to));
  }

  if (method === 'POST' && path === '/client-tracking') return res.status(202).json({ jobId: MOCK_JOB_ID });
  if (method === 'GET' && /^\/client-tracking\/buyers\/[0-9a-f-]{36}$/i.test(path)) return res.json({ ...mockCampaignJob, progress: { ...mockCampaignJob.progress, updatedAt: new Date().toISOString() } });
  if (method === 'POST' && path === '/client-tracking/send') return res.status(202).json({ jobId: MOCK_JOB_ID, status: 'PROCESSING' });
  if (method === 'GET' && path === '/activity') return res.json(mockActivity);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return res.status(409).json({ error: 'Esta acción está deshabilitada mientras MOCK=true para proteger los datos reales.', code: 'MOCK_READ_ONLY' });
  }
  return next();
}

export function mockAccountMiddleware(req, res, next) {
  if (!config.mock) return next();
  const method = req.method.toUpperCase();
  const path = req.path;
  if (method === 'GET' && path === '/') return next();
  if (method === 'POST' && path === '/consent') return res.json({ ok: true });
  if (method === 'POST' && path === '/plan-request') {
    const requestId = 'demo-plan-2026-001';
    const text = `Hola, quiero consultar un plan de Flow Sell. Mi solicitud demo es ${requestId}.`;
    return res.json({ requestId, whatsappUrl: `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}` });
  }
  if (method === 'GET' && path === '/export') {
    return res.attachment('flowsell-datos-demo.json').json({
      generatedAt: new Date().toISOString(),
      account: mockAccountPayload(),
      templates: mockTemplates,
      products: mockSavedProducts,
      deliveries: mockActivity,
      note: 'Datos demostrativos generados con MOCK=true.',
    });
  }
  if (method === 'POST' && path === '/sessions/revoke') return res.status(409).json({ error: 'Acción deshabilitada mientras MOCK=true para proteger la sesión real.', code: 'MOCK_READ_ONLY' });
  if (method === 'POST' && path === '/disconnect') return res.status(409).json({ error: 'Acción deshabilitada mientras MOCK=true para proteger la conexión real.', code: 'MOCK_READ_ONLY' });
  if (method === 'DELETE' && path === '/') return res.status(409).json({ error: 'La eliminación de cuenta está deshabilitada mientras MOCK=true.', code: 'MOCK_READ_ONLY' });
  return next();
}
