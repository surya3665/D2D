# DAY TO DAY – QR Laundry Price List

A static Vite + React + TypeScript app for the DAY TO DAY laundry business.

## Features

- Customer-facing, mobile-responsive price list.
- Customer URL suitable for a visiting-card QR code: `https://YOUR-DOMAIN/#/prices`
- Admin URL: `https://YOUR-DOMAIN/#/admin`
- Default admin login: `admin` / `D2D`
- Add, edit and delete topics.
- Add, edit and delete items.
- Add, edit and delete item prices.
- Local draft persistence using browser `localStorage`.
- Export/import catalogue JSON.
- QR code generation in the admin dashboard.
- No backend, no API and no database.

## Important no-backend limitation

This project does **not** synchronise data between devices.

Admin edits are saved in the current browser's `localStorage`. Customers scanning the QR code on their own phones load the published `public/catalog.json` file from the website. Therefore, after changing prices:

1. Sign in to Admin.
2. Make edits. They are saved as a draft in that browser.
3. Go to Overview and choose **Export catalogue**.
4. Replace the project's `public/catalog.json` with the downloaded file.
5. Run `npm run build`.
6. Deploy the new `dist` folder to Netlify or another static host.

After redeployment, customers will see the updated catalogue from their phones. The QR code URL remains the same as long as the website domain and path do not change.

To move your draft to another computer, use **Export catalogue** on the first computer and **Import catalog.json** on the other one.

## Local setup

Requirements: Node.js 20.19+ or 22.12+ recommended.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Production build

```bash
npm run build
npm run preview
```

The production files are created in `dist/`.

## Netlify deployment

1. Push this project to a GitHub repository.
2. In Netlify, import the repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy.
6. Open `https://YOUR-SITE.netlify.app/#/admin` and log in.
7. Generate the customer QR code from the Admin Overview. Use `https://YOUR-SITE.netlify.app/#/prices` as the QR destination.

## Security warning

The requested default username/password are hard-coded in the frontend. Anyone who inspects the downloaded JavaScript can discover them. This is only a convenience gate to keep casual visitors out of the admin screen; it is **not secure authentication**. Do not use this approach for sensitive data or a business system requiring protected admin access. Real authentication requires a backend or hosted authentication service.

## Source price data

The initial catalogue was transcribed from the uploaded workbook:
- Clothing Price List: 15 items, with Wash, D.C. / Dry Cleaning, Starch and Wash & Starch columns.
- Household Price List: 7 items with amount/rate.
- Prices and item names are initialized as supplied in that workbook.
