/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SampleDoc } from '../types';

function createSvgDataUrl(svgContent: string): string {
  const encoded = encodeURIComponent(svgContent.trim());
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const oliveOilLabelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">
  <defs>
    <linearGradient id="labelBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcfbf7"/>
      <stop offset="100%" stop-color="#f5f0e6"/>
    </linearGradient>
    <linearGradient id="goldBanner" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#854d0e"/>
      <stop offset="50%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
  </defs>

  <!-- Container Box -->
  <rect x="0" y="0" width="900" height="580" rx="20" fill="url(#labelBg)" stroke="#d97706" stroke-width="3"/>

  <!-- Top Brand Banner -->
  <rect x="0" y="0" width="900" height="90" rx="20" fill="url(#goldBanner)"/>
  <rect x="0" y="70" width="900" height="20" fill="#854d0e"/>
  <text x="450" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">TERRA MEDITERRA ORGANICS</text>
  <text x="450" y="75" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#fef08a" text-anchor="middle" letter-spacing="2">EST. 1978 • CERTIFIED EXTRA VIRGIN</text>

  <!-- Product Title -->
  <text x="50" y="145" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#1e293b">COLD-PRESSED EXTRA VIRGIN OLIVE OIL</text>
  <text x="50" y="175" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#b45309">Category: Gourmet Food &amp; Culinary Oils • Single Origin Harvest</text>

  <!-- Divider Line -->
  <line x1="50" y1="195" x2="850" y2="195" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Key Product Specifications Table -->
  <rect x="50" y="215" width="250" height="80" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="70" y="242" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">NET QUANTITY / VOLUME</text>
  <text x="70" y="278" font-family="system-ui, sans-serif" font-size="26" font-weight="900" fill="#0f172a">500 ml</text>

  <rect x="325" y="215" width="250" height="80" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="345" y="242" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">SKU NUMBER</text>
  <text x="345" y="278" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#0f172a">TM-EVOO-500</text>

  <rect x="600" y="215" width="250" height="80" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="620" y="242" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">M.R.P. (INCL. TAXES)</text>
  <text x="620" y="278" font-family="system-ui, sans-serif" font-size="26" font-weight="900" fill="#15803d">$14.99</text>

  <!-- Batch & Dates Row -->
  <rect x="50" y="315" width="525" height="120" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  
  <text x="70" y="345" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#475569">BATCH / LOT NUMBER:</text>
  <text x="260" y="345" font-family="system-ui, monospace" font-size="16" font-weight="800" fill="#0f172a">LOT-TM2024-X9</text>

  <text x="70" y="378" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#475569">MANUFACTURING DATE (MFG):</text>
  <text x="280" y="378" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#0f172a">2024-06-15</text>

  <text x="70" y="410" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#475569">EXPIRY DATE (EXP):</text>
  <text x="220" y="410" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#dc2626">2026-06-15</text>

  <text x="350" y="410" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">BEST BEFORE: 24 MONTHS</text>

  <!-- Barcode Graphic Box -->
  <rect x="600" y="315" width="250" height="120" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="725" y="340" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#64748b" text-anchor="middle">EAN-13 BARCODE</text>
  <text x="725" y="380" font-family="monospace" font-size="20" fill="#0f172a" text-anchor="middle" letter-spacing="3">|| ||| || |||| ||| ||</text>
  <text x="725" y="415" font-family="monospace" font-size="14" font-weight="700" fill="#0f172a" text-anchor="middle">8901030829471</text>

  <!-- Footer Legal & Storage Notes -->
  <rect x="50" y="455" width="800" height="90" rx="10" fill="#fefce8" stroke="#fef08a"/>
  <text x="70" y="482" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#854d0e">INGREDIENTS: 100% Pure Cold-Pressed Mediterranean Olives. Product of Spain.</text>
  <text x="70" y="505" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#713f12">Storage Instructions: Store in a cool, dark place away from direct sunlight and heat sources.</text>
  <text x="70" y="525" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#a16207">Marketed By: Terra Mediterra Brands Inc., 450 Olive Way, Portland, OR 97201</text>
</svg>
`;

const pharmaPackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">
  <defs>
    <linearGradient id="pharmaHeader" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="900" height="580" rx="20" fill="#ffffff" stroke="#bae6fd" stroke-width="3"/>

  <!-- Top Blue Header -->
  <rect x="0" y="0" width="900" height="85" rx="20" fill="url(#pharmaHeader)"/>
  <rect x="0" y="65" width="900" height="20" fill="#0369a1"/>
  <text x="40" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="1">MEDICLEAR PHARMACEUTICALS</text>
  <text x="40" y="68" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#e0f2fe">CLINICAL HEALTHCARE DIVISION • NDC 54868-0921-0</text>

  <!-- Product Title -->
  <text x="40" y="140" font-family="system-ui, sans-serif" font-size="32" font-weight="900" fill="#0f172a">ALLERGY RELIEF • LORATADINE 10mg</text>
  <text x="40" y="168" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#0284c7">Non-Drowsy 24-Hour Antihistamine Tablets • Category: Pharmaceuticals</text>

  <line x1="40" y1="188" x2="860" y2="188" stroke="#f1f5f9" stroke-width="2"/>

  <!-- Details Row 1 -->
  <rect x="40" y="205" width="255" height="80" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="60" y="230" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">SKU / ITEM CODE</text>
  <text x="60" y="265" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#0f172a">MC-ALR-10MG</text>

  <rect x="315" y="205" width="255" height="80" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="335" y="230" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">QUANTITY &amp; UNIT</text>
  <text x="335" y="265" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#0f172a">30 Tablets</text>

  <rect x="590" y="205" width="270" height="80" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="610" y="230" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b">MAX RETAIL PRICE (MRP)</text>
  <text x="610" y="265" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#0284c7">$18.50</text>

  <!-- Batch & Dates -->
  <rect x="40" y="305" width="530" height="130" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="60" y="338" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#334155">BATCH NO (B.No):</text>
  <text x="210" y="338" font-family="system-ui, monospace" font-size="17" font-weight="800" fill="#0f172a">B.NO. 8942-A</text>

  <text x="60" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#334155">MANUFACTURING DATE (MFD):</text>
  <text x="300" y="375" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#0f172a">2024-03-01</text>

  <text x="60" y="412" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#334155">EXPIRY DATE (EXP):</text>
  <text x="215" y="412" font-family="system-ui, sans-serif" font-size="17" font-weight="800" fill="#e11d48">2027-02-28</text>

  <!-- Barcode Box -->
  <rect x="590" y="305" width="270" height="130" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="725" y="332" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle">UPC BARCODE</text>
  <text x="725" y="378" font-family="monospace" font-size="24" fill="#0f172a" text-anchor="middle" letter-spacing="4">|| |||| ||| |||| || |||</text>
  <text x="725" y="415" font-family="monospace" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle">725272730706</text>

  <!-- Warnings & Instructions -->
  <rect x="40" y="455" width="820" height="95" rx="10" fill="#fef2f2" stroke="#fecaca"/>
  <text x="60" y="482" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#991b1b">WARNING: Keep out of reach of children. Store between 20° to 25°C (68° to 77°F).</text>
  <text x="60" y="505" font-family="system-ui, sans-serif" font-size="12" font-weight="500" fill="#7f1d1d">Active Ingredient (in each tablet): Loratadine 10 mg (Antihistamine). Inactive: corn starch, lactose.</text>
  <text x="60" y="528" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#991b1b">Manufactured By: MediClear Labs Inc., 800 Pharma Way, Chicago, IL 60611</text>
</svg>
`;

const driverLicenseSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="900" height="560" rx="24" fill="url(#cardGrad)" stroke="#cbd5e1" stroke-width="4"/>
  
  <rect x="0" y="0" width="900" height="96" rx="24" fill="url(#headerGrad)"/>
  <rect x="0" y="60" width="900" height="36" fill="#334155"/>
  <text x="40" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#ffffff" letter-spacing="2">STATE OF CALIFORNIA</text>
  <text x="40" y="84" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" letter-spacing="1">DEPARTMENT OF MOTOR VEHICLES • DRIVER LICENSE</text>
  
  <rect x="40" y="125" width="220" height="280" rx="16" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
  <circle cx="150" cy="220" r="55" fill="#cbd5e1"/>
  <path d="M 70 380 Q 150 280 230 380 Z" fill="#cbd5e1"/>
  <text x="150" y="380" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#475569" text-anchor="middle">OFFICIAL PORTRAIT</text>

  <text x="290" y="145" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">DL NUMBER</text>
  <text x="290" y="175" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#0f172a">D8294719-CA</text>
  
  <text x="290" y="215" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">FULL LEGAL NAME</text>
  <text x="290" y="245" font-family="system-ui, sans-serif" font-size="26" font-weight="800" fill="#0f172a">ALEXANDER JAMES MORGAN</text>

  <text x="290" y="290" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">DATE OF BIRTH</text>
  <text x="290" y="318" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#1e293b">1988-05-14</text>

  <text x="520" y="290" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">EXPIRATION DATE</text>
  <text x="520" y="318" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#dc2626">2029-05-14</text>

  <text x="710" y="290" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">ISSUE DATE</text>
  <text x="710" y="318" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#1e293b">2024-05-14</text>

  <text x="290" y="365" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">RESIDENTIAL ADDRESS</text>
  <text x="290" y="395" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#1e293b">742 EVERGREEN TERRACE, SAN FRANCISCO, CA 94107</text>

  <rect x="40" y="480" width="820" height="48" rx="8" fill="#1e293b"/>
  <text x="450" y="510" font-family="monospace" font-size="15" fill="#f8fafc" text-anchor="middle" letter-spacing="4">|| | ||| | |||| || ||| || |||| ||| || | |||| || ||| || | |||| || ||| ||||</text>
</svg>
`;

const invoiceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <rect x="0" y="0" width="900" height="600" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
  
  <rect x="40" y="40" width="48" height="48" rx="8" fill="#0284c7"/>
  <text x="105" y="72" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#0f172a">APEX DIGITAL SOLUTIONS INC.</text>
  <text x="105" y="94" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#64748b">500 TECH BOULEVARD, SUITE 400, AUSTIN, TX 78701</text>
  
  <text x="860" y="70" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#0284c7" text-anchor="end">INVOICE</text>
  <text x="860" y="95" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#64748b" text-anchor="end">INV-2025-0842</text>

  <line x1="40" y1="120" x2="860" y2="120" stroke="#e2e8f0" stroke-width="2"/>

  <text x="40" y="155" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#0284c7">BILLED TO (CLIENT)</text>
  <text x="40" y="185" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#0f172a">SARAH ELIZABETH CHEN</text>
  <text x="40" y="210" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#334155">CHEN CONSULTING PARTNERS</text>
  <text x="40" y="232" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#334155">1200 GRAND AVENUE, SEATTLE, WA 98101</text>
  <text x="40" y="254" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#334155">sarah.chen@chenpartners.com • (206) 555-0194</text>

  <text x="560" y="155" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">INVOICE DATE</text>
  <text x="560" y="180" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#0f172a">2025-09-10</text>

  <text x="730" y="155" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#64748b">PAYMENT DUE</text>
  <text x="730" y="180" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#dc2626">2025-10-10</text>

  <rect x="520" y="445" width="340" height="110" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="545" y="480" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#64748b">SUBTOTAL</text>
  <text x="835" y="480" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#334155" text-anchor="end">$5,050.00</text>
  <text x="545" y="525" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#0f172a">TOTAL BALANCE DUE</text>
  <text x="835" y="525" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="#0284c7" text-anchor="end">$5,050.00</text>
</svg>
`;

const coffeeFrontSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">
  <defs>
    <linearGradient id="coffeeFrontBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#292524"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
    <linearGradient id="goldCopper" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="900" height="580" rx="20" fill="url(#coffeeFrontBg)" stroke="#78350f" stroke-width="4"/>
  
  <rect x="0" y="0" width="900" height="24" rx="10" fill="url(#goldCopper)"/>
  
  <text x="450" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="4">HIGHLAND ARTISAN ROASTERS</text>
  <text x="450" y="100" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#a8a29e" text-anchor="middle" letter-spacing="2">FRONT SIDE • SINGLE-ORIGIN ESTATE COFFEE</text>

  <line x1="100" y1="130" x2="800" y2="130" stroke="#44403c" stroke-width="2"/>

  <text x="450" y="210" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="#fafaf9" text-anchor="middle">SUMATRA RESERVE DARK ROAST</text>
  <text x="450" y="250" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#d97706" text-anchor="middle">Category: Organic Whole Bean Specialty Coffee</text>

  <rect x="150" y="320" width="600" height="120" rx="16" fill="#292524" stroke="#78350f" stroke-width="2"/>
  
  <text x="450" y="365" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#a8a29e" text-anchor="middle">NET WEIGHT / QUANTITY</text>
  <text x="450" y="415" font-family="system-ui, sans-serif" font-size="38" font-weight="900" fill="#fafaf9" text-anchor="middle">340 g (12 oz)</text>

  <rect x="300" y="480" width="300" height="42" rx="21" fill="#78350f"/>
  <text x="450" y="507" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#fef3c7" text-anchor="middle" letter-spacing="1">PHOTO 1 OF 2 : FRONT PANEL</text>
</svg>
`;

const coffeeBackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">
  <defs>
    <linearGradient id="coffeeBackBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#0c0a09"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="900" height="580" rx="20" fill="url(#coffeeBackBg)" stroke="#44403c" stroke-width="4"/>

  <rect x="40" y="40" width="820" height="45" rx="8" fill="#292524"/>
  <text x="450" y="70" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#fbbf24" text-anchor="middle" letter-spacing="2">BACK LABEL: BATCH, BARCODE &amp; EXPIRY SPECIFICATIONS</text>

  <!-- SKU & Price -->
  <rect x="50" y="115" width="380" height="90" rx="12" fill="#292524" stroke="#44403c"/>
  <text x="75" y="145" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">SKU IDENTIFIER</text>
  <text x="75" y="185" font-family="system-ui, monospace" font-size="24" font-weight="800" fill="#fafaf9">HAC-SUMATRA-340</text>

  <rect x="470" y="115" width="380" height="90" rx="12" fill="#292524" stroke="#44403c"/>
  <text x="495" y="145" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">M.R.P. (MAX RETAIL PRICE)</text>
  <text x="495" y="185" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#4ade80">$18.99</text>

  <!-- Batch & Dates -->
  <rect x="50" y="230" width="800" height="110" rx="12" fill="#292524" stroke="#44403c"/>
  
  <text x="75" y="265" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">BATCH / LOT NO:</text>
  <text x="210" y="265" font-family="system-ui, monospace" font-size="17" font-weight="800" fill="#fbbf24">LOT-SC2025-R4</text>

  <text x="75" y="310" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">MFD / ROASTED ON:</text>
  <text x="210" y="310" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#fafaf9">2025-02-10</text>

  <text x="480" y="265" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">EXPIRY DATE:</text>
  <text x="600" y="265" font-family="system-ui, sans-serif" font-size="17" font-weight="800" fill="#ef4444">2026-02-10</text>

  <text x="480" y="310" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#a8a29e">BEST BEFORE:</text>
  <text x="600" y="310" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#fbbf24">2026-02-10</text>

  <!-- Barcode Box -->
  <rect x="50" y="365" width="800" height="150" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="450" y="395" font-family="monospace" font-size="34" fill="#0f172a" text-anchor="middle" letter-spacing="4">||||| | ||| ||||| || |||| ||| ||||||| |</text>
  <text x="450" y="440" font-family="system-ui, monospace" font-size="24" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="4">084729103958</text>
  <text x="450" y="480" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">PHOTO 2 OF 2 : BACK REGULATORY BARCODE PANEL</text>
</svg>
`;

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'sample-multi-coffee',
    name: 'Front & Back Coffee Pack (2 Photos)',
    category: 'product',
    type: 'Multi-Angle Packaging (Front + Back)',
    description: 'Photo 1: Brand & Product Name • Photo 2: Barcode, Lot LOT-SC2025-R4, Expiry & Price',
    dataUrl: createSvgDataUrl(coffeeFrontSvg),
    additionalPhotos: [createSvgDataUrl(coffeeBackSvg)],
  },
  {
    id: 'sample-olive-oil',
    name: 'Extra Virgin Olive Oil Label',
    category: 'product',
    type: 'Product Packaging Label',
    description: 'Food label with SKU, Barcode, Lot number, Mfg/Exp dates, 500ml quantity, and MRP',
    dataUrl: createSvgDataUrl(oliveOilLabelSvg),
  },
  {
    id: 'sample-pharma-pack',
    name: 'Pharma Medicine Pack',
    category: 'product',
    type: 'Pharmaceutical Packaging',
    description: 'Antihistamine blister pack with B.No, Mfg/Exp dates, Barcode, and 30 Tablets count',
    dataUrl: createSvgDataUrl(pharmaPackSvg),
  },
  {
    id: 'sample-driver-license',
    name: "Driver's License",
    category: 'document',
    type: 'Official Identity Card',
    description: 'State Driver License with photo, DL number, DOB, and address',
    dataUrl: createSvgDataUrl(driverLicenseSvg),
  },
  {
    id: 'sample-invoice',
    name: 'Commercial Invoice',
    category: 'document',
    type: 'Billing / Invoice',
    description: 'Corporate service invoice with line items, client, and totals',
    dataUrl: createSvgDataUrl(invoiceSvg),
  },
];
