# 🔍 VaLuLens — Intrinsic Value Finder

**VaLuLens** adalah platform analisa fundamental saham berbasis web yang didesain untuk membantu investor serius menemukan nilai intrinsik di balik sebuah ticker tanpa "noise" pasar. Alat ini menggabungkan beberapa metode valuasi klasik untuk memberikan estimasi harga wajar yang presisi.

📊 **Live:** [funda.farelhanafi.my.id](https://funda.farelhanafi.my.id)

---

## 🚀 Fitur Utama

*   **Multi-Method Valuation:** Menggabungkan Graham Number, Discounted Cash Flow (DCF), dan P/E Band Multiple.
*   **Automatic Health Checklist:** Evaluasi instan kesehatan finansial berdasarkan ROE, DER, P/B Ratio, dan konsistensi pertumbuhan EPS.
*   **Weighted Fair Value:** Perhitungan nilai wajar menggunakan bobot dinamis (30% Graham, 40% DCF, 30% PE Band).
*   **Dynamic Currency Support:** Mendeteksi otomatis mata uang berdasarkan ticker (contoh: `.JK` untuk Rupiah).
*   **Export-Ready Report:** Simpan hasil analisa dalam format gambar profesional lengkap dengan *timestamp* dan periode data.
*   **Stock Comparison:** Fitur *side-by-side* untuk membandingkan dua emiten sekaligus.

---

## 🛠️ Metodologi Perhitungan

Aplikasi ini mengandalkan prinsip dasar analisis fundamental:

1.  **Graham Number:** 
    $$\sqrt{22.5 \times EPS \times BVPS}$$
    Didesain untuk mencari harga wajar konservatif bagi perusahaan dengan aset dan laba positif.

2.  **Discounted Cash Flow (DCF):**
    Memproyeksikan laba masa depan berdasarkan CAGR historis yang disesuaikan, kemudian didiskon kembali ke nilai sekarang dengan *discount rate* 10%.

3.  **Margin of Safety (MoS):**
    Menghitung selisih persentase antara harga pasar saat ini dengan *Intrinsic Value*. Kami menyarankan MoS minimal 30% untuk meminimalisir risiko.

---

## 💻 Tech Stack

*   **Frontend:** React.js / Next.js (Tailwind CSS for styling)
*   **Backend:** Node.js
*   **Visuals:** Lucide Icons & Custom Canvas Engine for image export
*   **Deployment:** Vercel / Personal VPS

---

## 📈 Cara Penggunaan

1. Masukkan **Ticker Symbol** (contoh: `BBRI` atau `ASII.JK`).
2. Input data finansial terbaru (EPS, BVPS, ROE, DER) dari laporan keuangan atau Stockbit.
3. Klik **Calculate** untuk melihat dashboard analisa lengkap.
4. Gunakan fitur **Save Report** untuk membagikan hasil analisa ke komunitas atau media sosial.

---

## ⚖️ Disclaimer

**VaLuLens** adalah alat bantu pendukung keputusan dan edukasi, bukan nasihat keuangan profesional. Investasi saham memiliki risiko tinggi. Selalu lakukan *due diligence* Anda sendiri sebelum membuat keputusan investasi.

---

Developed with ☕ and logic by **Farel Hanafi** © 2026