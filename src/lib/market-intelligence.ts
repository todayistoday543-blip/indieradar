/**
 * Market Intelligence Engine
 *
 * Perplexity-grade analysis layer that transforms raw indie hacker articles
 * into deep, actionable market intelligence for any country/industry.
 *
 * This module provides:
 * 1. Country-specific market context (regulations, payment, culture)
 * 2. Multi-industry application mapping
 * 3. Competitive landscape analysis
 * 4. TAM/SAM estimation for each market
 */

/** Country market profiles — structured data for Claude to reference */
export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  JP: {
    name: 'Japan',
    nameLocal: '日本',
    currency: 'JPY',
    population: 125_000_000,
    internetPenetration: 0.93,
    ecommerceMarketSize: '$150B',
    paymentMethods: ['クレジットカード', 'コンビニ決済', '銀行振込', 'PayPay', 'Stripe JP'],
    paymentPlatforms: ['Stripe JP', 'PAY.JP', 'GMO Payment Gateway'],
    legalNotes: '特定商取引法の表記が必須。個人事業主でも開業届が必要。インボイス制度対応。',
    culturalNotes: '品質重視の市場。無料トライアル→有料転換率が低め。信頼構築に時間がかかるが、一度信頼されるとLTVが高い。日本語UIは必須。',
    techEcosystem: 'エンジニア採用難。ノーコード/ローコード需要高。SaaS浸透率は欧米比で低くまだ伸びしろ大。',
    topPlatforms: ['note', 'Zenn', 'Qiita', 'X (Twitter JP)', 'Product Hunt JP'],
    taxInfo: '消費税10%。年間売上1000万円超で課税事業者。',
    startupCost: '開業届（無料）+ ドメイン（年1,500円）+ サーバー（無料〜月1,000円）',
  },
  US: {
    name: 'United States',
    nameLocal: 'United States',
    currency: 'USD',
    population: 330_000_000,
    internetPenetration: 0.92,
    ecommerceMarketSize: '$870B',
    paymentMethods: ['Credit Card', 'ACH', 'Apple Pay', 'Google Pay'],
    paymentPlatforms: ['Stripe', 'Paddle', 'LemonSqueezy'],
    legalNotes: 'LLC formation ($50-500 depending on state). Sales tax varies by state. GDPR-like laws in California (CCPA).',
    culturalNotes: 'Largest SaaS market. Early adopters. High willingness to pay for productivity tools. Competition is fierce but TAM is huge.',
    techEcosystem: 'Most mature startup ecosystem. YC, Indie Hackers community. Product Hunt launches matter.',
    topPlatforms: ['Product Hunt', 'Hacker News', 'Reddit', 'Twitter/X', 'LinkedIn'],
    taxInfo: 'Federal + state taxes. Self-employment tax ~15.3%. Consider LLC/S-Corp.',
    startupCost: 'LLC ($50-500) + Domain ($10/yr) + Hosting (free-$20/mo)',
  },
  KR: {
    name: 'South Korea',
    nameLocal: '한국',
    currency: 'KRW',
    population: 52_000_000,
    internetPenetration: 0.97,
    ecommerceMarketSize: '$140B',
    paymentMethods: ['신용카드', '카카오페이', '네이버페이', '토스'],
    paymentPlatforms: ['Toss Payments', 'Stripe KR', 'KG이니시스'],
    legalNotes: '사업자등록 필수. 전자상거래법 준수. 개인정보보호법(PIPA) 엄격.',
    culturalNotes: '세계 최고의 인터넷 보급률. 모바일 퍼스트. 카카오/네이버 생태계가 지배적. 빠른 트렌드 변화.',
    techEcosystem: '개발자 커뮤니티 활발. 노코드 도구 수요 증가. B2B SaaS 시장 급성장.',
    topPlatforms: ['디스콜드', '브런치', '벨로그', 'Product Hunt'],
    taxInfo: '부가세 10%. 종합소득세.',
    startupCost: '사업자등록(무료) + 도메인(연 1만원) + 호스팅(무료~월 1만원)',
  },
  CN: {
    name: 'China',
    nameLocal: '中国',
    currency: 'CNY',
    population: 1_400_000_000,
    internetPenetration: 0.73,
    ecommerceMarketSize: '$2.3T',
    paymentMethods: ['微信支付', '支付宝', '银联'],
    paymentPlatforms: ['微信支付', '支付宝', 'Ping++'],
    legalNotes: 'ICP备案必须。数据本地化要求。外资企业需要WFOE或合资。Great Firewall影响国际服务访问。',
    culturalNotes: '全球最大电商市场。超级App生态（微信小程序）。社交电商和直播带货是主流。价格敏感但规模巨大。',
    techEcosystem: '微信小程序、抖音小程序生态。独立站工具：Shopify中国替代品（有赞、微盟）。',
    topPlatforms: ['微信公众号', '知乎', '小红书', 'V2EX', '即刻'],
    taxInfo: '增值税6%（小规模纳税人3%）。企业所得税25%。',
    startupCost: '营业执照（免费）+ 域名（年60元）+ 服务器（年几百元）',
  },
  DE: {
    name: 'Germany',
    nameLocal: 'Deutschland',
    currency: 'EUR',
    population: 84_000_000,
    internetPenetration: 0.93,
    ecommerceMarketSize: '$100B',
    paymentMethods: ['SEPA', 'Kreditkarte', 'PayPal', 'Klarna', 'Sofort'],
    paymentPlatforms: ['Stripe EU', 'LemonSqueezy', 'Paddle (EU VAT)'],
    legalNotes: 'DSGVO (GDPR) streng. Impressumspflicht. Gewerbeanmeldung erforderlich. Verbraucherschutz beachten.',
    culturalNotes: 'Datenschutz-bewusster Markt. Deutsche Sprachversion oft erwartet. Qualität > Preis. B2B SaaS-Markt wächst stark.',
    techEcosystem: 'Starke Startup-Szene in Berlin. Wachsender VC-Markt. EU-Datenschutz als Wettbewerbsvorteil.',
    topPlatforms: ['LinkedIn', 'XING', 'Product Hunt', 'Hacker News'],
    taxInfo: 'USt 19%. Kleinunternehmerregelung bis €22.000/Jahr möglich.',
    startupCost: 'Gewerbeanmeldung (€20-60) + Domain (€10/Jahr) + Hosting (kostenlos-€20/Monat)',
  },
  FR: {
    name: 'France',
    nameLocal: 'France',
    currency: 'EUR',
    population: 67_000_000,
    internetPenetration: 0.92,
    ecommerceMarketSize: '$70B',
    paymentMethods: ['Carte Bancaire', 'PayPal', 'Virement SEPA', 'Apple Pay'],
    paymentPlatforms: ['Stripe EU', 'LemonSqueezy', 'Paddle'],
    legalNotes: 'Statut micro-entrepreneur simplifié. RGPD. Mentions légales obligatoires.',
    culturalNotes: 'Station F = plus grand campus de startups au monde. Marché francophone (France + Afrique). Préférence pour les produits en français.',
    techEcosystem: 'French Tech en plein essor. BPI France pour financement. Écosystème forte à Paris, Lyon, Toulouse.',
    topPlatforms: ['LinkedIn', 'Product Hunt', 'Malt (freelance)'],
    taxInfo: 'Micro-entrepreneur: 22-24% charges. TVA 20% au-delà de €36.800.',
    startupCost: 'Micro-entreprise (gratuit) + Domaine (€10/an) + Hébergement (gratuit-€20/mois)',
  },
  IN: {
    name: 'India',
    nameLocal: 'India',
    currency: 'INR',
    population: 1_400_000_000,
    internetPenetration: 0.52,
    ecommerceMarketSize: '$85B',
    paymentMethods: ['UPI', 'Credit Card', 'Net Banking', 'Paytm', 'PhonePe'],
    paymentPlatforms: ['Razorpay', 'Stripe India', 'Cashfree'],
    legalNotes: 'GST registration above ₹20L turnover. DPIIT startup recognition for tax benefits. Data Protection Bill.',
    culturalNotes: 'Price-sensitive but massive market. Mobile-first (98% mobile internet). Freemium works well. Hindi + English bilingual market.',
    techEcosystem: 'Huge developer talent pool. Bangalore is tech hub. Growing indie hacker community. Low cost to build.',
    topPlatforms: ['Twitter/X', 'LinkedIn', 'Product Hunt', 'IndieHackers'],
    taxInfo: 'GST 18% for SaaS. Income tax slabs. Startup India benefits (3yr tax holiday).',
    startupCost: 'Sole proprietorship (₹0) + Domain (₹800/yr) + Hosting (free)',
  },
  BR: {
    name: 'Brazil',
    nameLocal: 'Brasil',
    currency: 'BRL',
    population: 215_000_000,
    internetPenetration: 0.81,
    ecommerceMarketSize: '$50B',
    paymentMethods: ['PIX', 'Cartão de crédito', 'Boleto bancário'],
    paymentPlatforms: ['Stripe Brazil', 'PagSeguro', 'Mercado Pago'],
    legalNotes: 'MEI (Microempreendedor Individual) até R$81k/ano. LGPD (proteção de dados). NF obrigatória.',
    culturalNotes: 'Maior mercado da América Latina. PIX revolucionou pagamentos. WhatsApp é canal principal. Conteúdo em português é essencial.',
    techEcosystem: 'Ecossistema de startups em crescimento. São Paulo é hub principal. Custo de desenvolvimento menor que EUA/Europa.',
    topPlatforms: ['LinkedIn', 'Twitter/X', 'Product Hunt', 'TabNews'],
    taxInfo: 'MEI: 5% do salário mínimo/mês. Simples Nacional: 6-33%.',
    startupCost: 'MEI (R$0) + Domínio (R$40/ano) + Hospedagem (grátis)',
  },
  GB: {
    name: 'United Kingdom',
    nameLocal: 'United Kingdom',
    currency: 'GBP',
    population: 67_000_000,
    internetPenetration: 0.95,
    ecommerceMarketSize: '$120B',
    paymentMethods: ['Debit Card', 'Credit Card', 'Apple Pay', 'PayPal', 'Open Banking'],
    paymentPlatforms: ['Stripe UK', 'GoCardless', 'Paddle'],
    legalNotes: 'Ltd company formation (£12 online). UK GDPR. VAT registration above £85k.',
    culturalNotes: 'Strong SaaS adoption. English-language advantage for global reach. London fintech hub.',
    techEcosystem: 'London is Europe\'s largest tech hub. Strong VC ecosystem. SEIS/EIS tax incentives.',
    topPlatforms: ['Product Hunt', 'Hacker News', 'LinkedIn', 'Twitter/X'],
    taxInfo: 'Corporation tax 25%. VAT 20% above £85k threshold. SEIS/EIS for investors.',
    startupCost: 'Ltd company (£12) + Domain (£8/yr) + Hosting (free-£15/mo)',
  },
  SG: {
    name: 'Singapore',
    nameLocal: 'Singapore',
    currency: 'SGD',
    population: 5_900_000,
    internetPenetration: 0.96,
    ecommerceMarketSize: '$10B',
    paymentMethods: ['Credit Card', 'PayNow', 'GrabPay', 'Apple Pay'],
    paymentPlatforms: ['Stripe SG', 'PayMongo', 'Adyen'],
    legalNotes: 'Pte Ltd formation straightforward. PDPA data protection. Low tax jurisdiction (17% corporate).',
    culturalNotes: 'Gateway to Southeast Asia. English + Mandarin bilingual. High-income, tech-savvy population. Small domestic market but strategic location.',
    techEcosystem: 'Asia\'s startup hub. Strong government support (Enterprise SG grants). Access to ASEAN market of 680M people.',
    topPlatforms: ['LinkedIn', 'Product Hunt', 'Hacker News'],
    taxInfo: 'Corporate tax 17%. GST 9%. Tax exemption for first S$200k profit for new companies.',
    startupCost: 'Pte Ltd (S$315) + Domain (S$15/yr) + Hosting (free-S$20/mo)',
  },
};

export interface CountryProfile {
  name: string;
  nameLocal: string;
  currency: string;
  population: number;
  internetPenetration: number;
  ecommerceMarketSize: string;
  paymentMethods: string[];
  paymentPlatforms: string[];
  legalNotes: string;
  culturalNotes: string;
  techEcosystem: string;
  topPlatforms: string[];
  taxInfo: string;
  startupCost: string;
}

/** Industry verticals for cross-industry application mapping */
export const INDUSTRY_VERTICALS = [
  { id: 'healthcare', name: '医療・ヘルスケア', examples: ['テレメディスン', 'ヘルスケアSaaS', '患者管理'] },
  { id: 'education', name: '教育・EdTech', examples: ['オンラインコース', 'LMS', '語学学習'] },
  { id: 'fintech', name: '金融・FinTech', examples: ['決済', '会計SaaS', '投資ツール'] },
  { id: 'ecommerce', name: 'Eコマース', examples: ['D2C', 'マーケットプレイス', 'Shopifyアプリ'] },
  { id: 'realestate', name: '不動産・PropTech', examples: ['物件管理', 'バーチャルツアー', '不動産データ'] },
  { id: 'food', name: '飲食・FoodTech', examples: ['デリバリー', 'レストラン管理', 'フードD2C'] },
  { id: 'hr', name: '人事・HRTech', examples: ['採用管理', '勤怠管理', '人材マッチング'] },
  { id: 'legal', name: '法務・LegalTech', examples: ['契約管理', '法律相談', 'コンプライアンス'] },
  { id: 'creative', name: 'クリエイティブ', examples: ['デザインツール', '動画編集', 'AI画像生成'] },
  { id: 'devtools', name: '開発者ツール', examples: ['API', 'CI/CD', 'モニタリング'] },
  { id: 'marketing', name: 'マーケティング', examples: ['SEO', 'SNS管理', 'メール配信'] },
  { id: 'logistics', name: '物流・サプライチェーン', examples: ['配送管理', '在庫管理', 'トラッキング'] },
];

/**
 * Build the market intelligence context string for Claude API calls.
 * This gives Claude structured data about a specific country to produce
 * Perplexity-grade localized analysis.
 */
export function buildCountryContext(countryCode: string | null): string {
  if (!countryCode) {
    return `ユーザーの居住国は不明です。
グローバルに適用可能な分析を提供してください。
主要5市場（米国、日本、EU、東南アジア、インド）のうち最も関連性の高い市場に言及してください。`;
  }

  const profile = COUNTRY_PROFILES[countryCode.toUpperCase()];
  if (!profile) {
    return `ユーザーの居住国: ${countryCode}（詳細プロファイルなし）
グローバルな観点でアドバイスしてください。`;
  }

  return `【ユーザーの市場環境】
国: ${profile.name}（${profile.nameLocal}）
人口: ${(profile.population / 1_000_000).toFixed(0)}百万人
インターネット普及率: ${(profile.internetPenetration * 100).toFixed(0)}%
EC市場規模: ${profile.ecommerceMarketSize}
主要決済: ${profile.paymentMethods.join(', ')}
推奨決済プラットフォーム: ${profile.paymentPlatforms.join(', ')}

【法規制】
${profile.legalNotes}

【文化・市場特性】
${profile.culturalNotes}

【テック・スタートアップ環境】
${profile.techEcosystem}

【プロモーションプラットフォーム】
${profile.topPlatforms.join(', ')}

【税制】
${profile.taxInfo}

【起業コスト目安】
${profile.startupCost}

この情報を踏まえて、${profile.name}市場に特化した具体的なアドバイスを提供してください。`;
}

/**
 * Build industry application context for cross-industry analysis.
 */
export function buildIndustryApplicationPrompt(businessModel: string): string {
  const relevant = INDUSTRY_VERTICALS.filter(v => {
    // Select 3-4 industries that could benefit from this business model
    return true; // Claude will select the most relevant ones
  }).slice(0, 6);

  return `【多業界応用分析】
このビジネスモデル（${businessModel}）の仕組みを、以下の業界に応用する具体的なアイデアを生成してください：

${relevant.map(v => `- ${v.name}: ${v.examples.join('、')}`).join('\n')}

各業界について：
1. 具体的なプロダクトアイデア（1行）
2. なぜこの業界で機能するか（2行）
3. 想定される市場規模感（1行）
4. 最初の一歩（1行）`;
}
