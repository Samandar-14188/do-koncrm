// Realistic Uzbek auto parts store seed data
// Models: Chevrolet Cobalt, Gentra, Lacetti, Nexia 1/2/3, Spark, Damas, Matiz, Tracker, Malibu

export const seedProducts = [
  {
    id: "prod-001",
    name: "Cobalt old tormoz kolodkasi (Hi-Q)",
    artikul: "A-12 / SB-112",
    costPrice: 95000,
    sellPrice: 140000,
    quantity: 14,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "prod-002",
    name: "Gentra svecha (NGK Original)",
    artikul: "B-03 / BKR6E-11",
    costPrice: 28000,
    sellPrice: 45000,
    quantity: 32,
    createdAt: "2026-11-01T08:30:00.000Z",
    updatedAt: "2026-11-01T08:30:00.000Z"
  },
  {
    id: "prod-003",
    name: "Nexia 3 havo filtri (Mahle)",
    artikul: "C-01 / LX-1204",
    costPrice: 35000,
    sellPrice: 55000,
    quantity: 18,
    createdAt: "2026-11-02T09:00:00.000Z",
    updatedAt: "2026-11-02T09:00:00.000Z"
  },
  {
    id: "prod-004",
    name: "Damas moy filtri (Mando)",
    artikul: "D-05 / MO-410",
    costPrice: 18000,
    sellPrice: 30000,
    quantity: 40,
    createdAt: "2026-11-02T09:30:00.000Z",
    updatedAt: "2026-11-02T09:30:00.000Z"
  },
  {
    id: "prod-005",
    name: "Castrol Magnatec 5W-30 Motor Moyi (Litr)",
    artikul: "Moy-01 / CAS-5W30",
    costPrice: 75000,
    sellPrice: 105000,
    quantity: 24.5, // decimal for oils!
    createdAt: "2026-11-03T10:00:00.000Z",
    updatedAt: "2026-11-03T10:00:00.000Z"
  },
  {
    id: "prod-006",
    name: "Felix Qizil Antifriz G12+ (Litr)",
    artikul: "Moy-04 / FLX-G12",
    costPrice: 22000,
    sellPrice: 35000,
    quantity: 38.0, // decimal supported
    createdAt: "2026-11-03T10:15:00.000Z",
    updatedAt: "2026-11-03T10:15:00.000Z"
  },
  {
    id: "prod-007",
    name: "Lacetti 1.8 Remen GRM komplekt (Gates)",
    artikul: "E-08 / K015419XS",
    costPrice: 320000,
    sellPrice: 440000,
    quantity: 5,
    createdAt: "2026-11-04T11:00:00.000Z",
    updatedAt: "2026-11-04T11:00:00.000Z"
  },
  {
    id: "prod-008",
    name: "Spark old amortizator (Mando Chap)",
    artikul: "F-12 / MSS-0104",
    costPrice: 260000,
    sellPrice: 360000,
    quantity: 6,
    createdAt: "2026-11-04T11:30:00.000Z",
    updatedAt: "2026-11-04T11:30:00.000Z"
  },
  {
    id: "prod-009",
    name: "Spark old amortizator (Mando O'ng)",
    artikul: "F-13 / MSS-0105",
    costPrice: 260000,
    sellPrice: 360000,
    quantity: 4,
    createdAt: "2026-11-04T11:35:00.000Z",
    updatedAt: "2026-11-04T11:35:00.000Z"
  },
  {
    id: "prod-010",
    name: "Cobalt sharovaya opora (CTR Korea)",
    artikul: "A-07 / CBKD-14",
    costPrice: 85000,
    sellPrice: 125000,
    quantity: 12,
    createdAt: "2026-11-05T09:00:00.000Z",
    updatedAt: "2026-11-05T09:00:00.000Z"
  },
  {
    id: "prod-011",
    name: "Gentra rulovoy nakonechnik (CTR)",
    artikul: "A-09 / CEKD-19",
    costPrice: 70000,
    sellPrice: 110000,
    quantity: 8,
    createdAt: "2026-11-05T09:30:00.000Z",
    updatedAt: "2026-11-05T09:30:00.000Z"
  },
  {
    id: "prod-012",
    name: "Cobalt orqa tormoz kolodkasi (Sangsin)",
    artikul: "A-15 / SA-098",
    costPrice: 110000,
    sellPrice: 160000,
    quantity: 7,
    createdAt: "2026-11-06T10:00:00.000Z",
    updatedAt: "2026-11-06T10:00:00.000Z"
  },
  {
    id: "prod-013",
    name: "Gentra suv pompasi (Onix/Gentra GM)",
    artikul: "G-02 / GM-96440244",
    costPrice: 195000,
    sellPrice: 280000,
    quantity: 0, // ZERO STOCK TEST ITEM
    createdAt: "2026-11-06T10:30:00.000Z",
    updatedAt: "2026-11-06T10:30:00.000Z"
  },
  {
    id: "prod-014",
    name: "Matiz generator remeni (Dongil 4PK665)",
    artikul: "H-01 / 4PK-665",
    costPrice: 28000,
    sellPrice: 45000,
    quantity: 15,
    createdAt: "2026-11-07T12:00:00.000Z",
    updatedAt: "2026-11-07T12:00:00.000Z"
  },
  {
    id: "prod-015",
    name: "Cobalt salon filtri (Uglerodli)",
    artikul: "C-09 / CF-8812",
    costPrice: 32000,
    sellPrice: 50000,
    quantity: 22,
    createdAt: "2026-11-07T12:20:00.000Z",
    updatedAt: "2026-11-07T12:20:00.000Z"
  },
  {
    id: "prod-016",
    name: "Nexia 2 old tormoz diski (Juft / Ferodo)",
    artikul: "P-04 / DDF-1092",
    costPrice: 280000,
    sellPrice: 390000,
    quantity: 3, // LOW STOCK TEST ITEM
    createdAt: "2026-11-08T14:00:00.000Z",
    updatedAt: "2026-11-08T14:00:00.000Z"
  },
  {
    id: "prod-017",
    name: "Mannol 10W-40 Classic Motor Moyi (Litr)",
    artikul: "Moy-02 / MN-10W40",
    costPrice: 48000,
    sellPrice: 70000,
    quantity: 16.5,
    createdAt: "2026-11-08T14:30:00.000Z",
    updatedAt: "2026-11-08T14:30:00.000Z"
  },
  {
    id: "prod-018",
    name: "Damas orqa ressor vtulka (Rezina komplekt)",
    artikul: "K-03 / DM-7712",
    costPrice: 25000,
    sellPrice: 42000,
    quantity: 28,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z"
  },
  {
    id: "prod-019",
    name: "Lacetti klapan qopqog'i prokladkasi (Viktor Reinz)",
    artikul: "L-02 / VR-71-381",
    costPrice: 65000,
    sellPrice: 100000,
    quantity: 0, // ZERO STOCK TEST ITEM
    createdAt: "2026-11-09T09:30:00.000Z",
    updatedAt: "2026-11-09T09:30:00.000Z"
  },
  {
    id: "prod-020",
    name: "Delkor Akkumulyator 60Ah (Korea)",
    artikul: "AKB-01 / 56030",
    costPrice: 620000,
    sellPrice: 780000,
    quantity: 6,
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z"
  },
  {
    id: "prod-021",
    name: "Osram H4 12V 60/55W Lampochka (Original)",
    artikul: "EL-01 / 64193",
    costPrice: 24000,
    sellPrice: 40000,
    quantity: 50,
    createdAt: "2026-11-10T10:30:00.000Z",
    updatedAt: "2026-11-10T10:30:00.000Z"
  },
  {
    id: "prod-022",
    name: "Cobalt stupitsa podshipnik old (ILJIN)",
    artikul: "A-22 / IJ-143005",
    costPrice: 170000,
    sellPrice: 240000,
    quantity: 9,
    createdAt: "2026-11-11T11:00:00.000Z",
    updatedAt: "2026-11-11T11:00:00.000Z"
  },
  {
    id: "prod-023",
    name: "Tracker 2 orqa tormoz kolodkasi (GM)",
    artikul: "T-04 / GM-42774",
    costPrice: 230000,
    sellPrice: 320000,
    quantity: 4,
    createdAt: "2026-11-11T11:30:00.000Z",
    updatedAt: "2026-11-11T11:30:00.000Z"
  },
  {
    id: "prod-024",
    name: "ZIC ATF Dexron VI Karobka Moyi (Litr)",
    artikul: "Moy-08 / ZIC-D6",
    costPrice: 85000,
    sellPrice: 120000,
    quantity: 11.5,
    createdAt: "2026-11-12T13:00:00.000Z",
    updatedAt: "2026-11-12T13:00:00.000Z"
  },
  {
    id: "prod-025",
    name: "Gentra old fara o'ng (GM Original)",
    artikul: "B-20 / GM-96540154",
    costPrice: 750000,
    sellPrice: 980000,
    quantity: 2, // LOW STOCK TEST ITEM
    createdAt: "2026-11-12T13:40:00.000Z",
    updatedAt: "2026-11-12T13:40:00.000Z"
  }
];

export const seedDebtors = [
  {
    id: "deb-001",
    name: "Bahrom usta",
    phone: "+998901234567",
    createdAt: "2026-11-05T10:00:00.000Z",
    transactions: [
      {
        id: "tx-deb-001",
        saleId: "sale-seed-01",
        date: "2026-11-05T10:00:00.000Z",
        amount: 450000,
        items: [
          { name: "Cobalt old tormoz kolodkasi (Hi-Q)", quantity: 2, price: 135000 },
          { name: "Cobalt salon filtri (Uglerodli)", quantity: 2, price: 45000 },
          { name: "Felix Qizil Antifriz G12+ (Litr)", quantity: 2.5, price: 36000 }
        ]
      },
      {
        id: "tx-deb-002",
        saleId: "sale-seed-02",
        date: "2026-11-10T15:30:00.000Z",
        amount: 360000,
        items: [
          { name: "Spark old amortizator (Mando Chap)", quantity: 1, price: 360000 }
        ]
      }
    ],
    payments: [
      {
        id: "pay-deb-001",
        date: "2026-11-08T11:00:00.000Z",
        amount: 300000,
        method: "cash",
        note: "Bahrom usta qisman to'ladi"
      }
    ]
    // Total Debt: 810,000, Total Paid: 300,000, Remaining: 510,000
  },
  {
    id: "deb-002",
    name: "Jamshid usta (Chilonzor)",
    phone: "+998935552233",
    createdAt: "2026-11-08T16:00:00.000Z",
    transactions: [
      {
        id: "tx-deb-003",
        saleId: "sale-seed-03",
        date: "2026-11-08T16:00:00.000Z",
        amount: 520000,
        items: [
          { name: "Gentra suv pompasi (Onix/Gentra GM)", quantity: 1, price: 280000 },
          { name: "Gentra rulovoy nakonechnik (CTR)", quantity: 2, price: 110000 },
          { name: "Gentra svecha (NGK Original)", quantity: 4, price: 45000 }
        ]
      }
    ],
    payments: [
      {
        id: "pay-deb-002",
        date: "2026-11-12T14:00:00.000Z",
        amount: 200000,
        method: "card",
        note: "Click orqali to'landi"
      }
    ]
    // Total Debt: 520,000, Total Paid: 200,000, Remaining: 320,000
  },
  {
    id: "deb-003",
    name: "Akmal avtoelektrik",
    phone: "+998977114400",
    createdAt: "2026-11-11T09:00:00.000Z",
    transactions: [
      {
        id: "tx-deb-004",
        saleId: "sale-seed-04",
        date: "2026-11-11T09:00:00.000Z",
        amount: 280000,
        items: [
          { name: "Osram H4 12V 60/55W Lampochka (Original)", quantity: 7, price: 40000 }
        ]
      }
    ],
    payments: [
      {
        id: "pay-deb-003",
        date: "2026-11-11T18:00:00.000Z",
        amount: 280000,
        method: "cash",
        note: "To'liq yopildi"
      }
    ]
    // Total Debt: 280,000, Total Paid: 280,000, Remaining: 0 (Settled debt test case)
  }
];

export const seedSales = [
  {
    id: "sale-seed-01",
    saleNumber: "S-1001",
    date: "2026-11-05T10:00:00.000Z",
    items: [
      {
        productId: "prod-001",
        productName: "Cobalt old tormoz kolodkasi (Hi-Q)",
        artikul: "A-12 / SB-112",
        quantity: 2,
        costPrice: 95000,
        sellPrice: 140000,
        bargainPrice: 135000
      },
      {
        productId: "prod-015",
        productName: "Cobalt salon filtri (Uglerodli)",
        artikul: "C-09 / CF-8812",
        quantity: 2,
        costPrice: 32000,
        sellPrice: 50000,
        bargainPrice: 45000
      },
      {
        productId: "prod-006",
        productName: "Felix Qizil Antifriz G12+ (Litr)",
        artikul: "Moy-04 / FLX-G12",
        quantity: 2.5,
        costPrice: 22000,
        sellPrice: 35000,
        bargainPrice: 36000
      }
    ],
    totalAmount: 450000,
    totalCost: 309000,
    totalProfit: 141000,
    paymentMode: "credit",
    paidCash: 0,
    paidCard: 0,
    creditAmount: 450000,
    realizedProfit: 0, // Unpaid at creation (cash-basis)
    debtorId: "deb-001",
    debtorName: "Bahrom usta",
    debtorPhone: "+998901234567",
    returned: false,
    returnedItems: []
  },
  {
    id: "sale-seed-02",
    saleNumber: "S-1002",
    date: "2026-11-10T15:30:00.000Z",
    items: [
      {
        productId: "prod-008",
        productName: "Spark old amortizator (Mando Chap)",
        artikul: "F-12 / MSS-0104",
        quantity: 1,
        costPrice: 260000,
        sellPrice: 360000,
        bargainPrice: 360000
      }
    ],
    totalAmount: 360000,
    totalCost: 260000,
    totalProfit: 100000,
    paymentMode: "credit",
    paidCash: 0,
    paidCard: 0,
    creditAmount: 360000,
    realizedProfit: 0,
    debtorId: "deb-001",
    debtorName: "Bahrom usta",
    debtorPhone: "+998901234567",
    returned: false,
    returnedItems: []
  },
  {
    id: "sale-seed-05",
    saleNumber: "S-1003",
    date: "2026-11-14T11:20:00.000Z",
    items: [
      {
        productId: "prod-002",
        productName: "Gentra svecha (NGK Original)",
        artikul: "B-03 / BKR6E-11",
        quantity: 4,
        costPrice: 28000,
        sellPrice: 45000,
        bargainPrice: 45000
      },
      {
        productId: "prod-005",
        productName: "Castrol Magnatec 5W-30 Motor Moyi (Litr)",
        artikul: "Moy-01 / CAS-5W30",
        quantity: 4.0,
        costPrice: 75000,
        sellPrice: 105000,
        bargainPrice: 100000
      }
    ],
    totalAmount: 580000,
    totalCost: 412000,
    totalProfit: 168000,
    paymentMode: "cash",
    paidCash: 580000,
    paidCard: 0,
    creditAmount: 0,
    realizedProfit: 168000,
    debtorId: null,
    debtorName: "",
    debtorPhone: "",
    returned: false,
    returnedItems: []
  },
  {
    id: "sale-seed-06",
    saleNumber: "S-1004",
    date: "2026-11-15T09:45:00.000Z",
    items: [
      {
        productId: "prod-020",
        productName: "Delkor Akkumulyator 60Ah (Korea)",
        artikul: "AKB-01 / 56030",
        quantity: 1,
        costPrice: 620000,
        sellPrice: 780000,
        bargainPrice: 750000
      }
    ],
    totalAmount: 750000,
    totalCost: 620000,
    totalProfit: 130000,
    paymentMode: "card",
    paidCash: 0,
    paidCard: 750000,
    creditAmount: 0,
    realizedProfit: 130000,
    debtorId: null,
    debtorName: "",
    debtorPhone: "",
    returned: false,
    returnedItems: []
  }
];
