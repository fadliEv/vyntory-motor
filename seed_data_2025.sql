-- Seed Data 2025 untuk Dealer Motor
-- Script ini akan membuat 400 motor dan ~200-280 transaksi

BEGIN TRANSACTION;

-- ===================================
-- PART 1: INSERT 400 MOTORS
-- ===================================

-- Honda Motors (100 units)
INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
SELECT
    CASE (rowid % 10)
        WHEN 0 THEN 'Honda Beat'
        WHEN 1 THEN 'Honda Vario 125'
        WHEN 2 THEN 'Honda Vario 160'
        WHEN 3 THEN 'Honda Scoopy'
        WHEN 4 THEN 'Honda PCX'
        WHEN 5 THEN 'Honda ADV 160'
        WHEN 6 THEN 'Honda CB150R'
        WHEN 7 THEN 'Honda CBR150R'
        WHEN 8 THEN 'Honda CRF150L'
        ELSE 'Honda Genio'
    END as nama_motor,
    'B ' || (1000 + (ABS(RANDOM()) % 9000)) || ' ' ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) as nomor_polisi,
    'tersedia' as status,
    (10 + (ABS(RANDOM()) % 20)) * 1000000 as harga_modal,
    (12 + (ABS(RANDOM()) % 25)) * 1000000 as harga,
    CASE (ABS(RANDOM()) % 10)
        WHEN 0 THEN 'Hitam'
        WHEN 1 THEN 'Putih'
        WHEN 2 THEN 'Merah'
        WHEN 3 THEN 'Biru'
        WHEN 4 THEN 'Silver'
        WHEN 5 THEN 'Abu-abu'
        WHEN 6 THEN 'Kuning'
        WHEN 7 THEN 'Hijau'
        WHEN 8 THEN 'Oranye'
        ELSE 'Coklat'
    END as warna,
    2020 + (ABS(RANDOM()) % 6) as tahun_motor,
    date('2025-01-01', '+' || (ABS(RANDOM()) % 365) || ' days') as pajak_date,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 292) || ' days', '+' || (ABS(RANDOM()) % 24) || ' hours') as tanggal_masuk,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM (
    SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) t1, (
    SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) t2
LIMIT 100;

-- Yamaha Motors (100 units)
INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
SELECT
    CASE (rowid % 10)
        WHEN 0 THEN 'Yamaha Mio M3'
        WHEN 1 THEN 'Yamaha Mio S'
        WHEN 2 THEN 'Yamaha Mio Z'
        WHEN 3 THEN 'Yamaha Aerox 155'
        WHEN 4 THEN 'Yamaha Lexi'
        WHEN 5 THEN 'Yamaha NMAX'
        WHEN 6 THEN 'Yamaha XMAX'
        WHEN 7 THEN 'Yamaha R15'
        WHEN 8 THEN 'Yamaha MT-15'
        ELSE 'Yamaha Fazzio'
    END as nama_motor,
    'B ' || (1000 + (ABS(RANDOM()) % 9000)) || ' ' ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) as nomor_polisi,
    'tersedia' as status,
    (10 + (ABS(RANDOM()) % 20)) * 1000000 as harga_modal,
    (12 + (ABS(RANDOM()) % 25)) * 1000000 as harga,
    CASE (ABS(RANDOM()) % 10)
        WHEN 0 THEN 'Hitam' WHEN 1 THEN 'Putih' WHEN 2 THEN 'Merah' WHEN 3 THEN 'Biru' WHEN 4 THEN 'Silver'
        WHEN 5 THEN 'Abu-abu' WHEN 6 THEN 'Kuning' WHEN 7 THEN 'Hijau' WHEN 8 THEN 'Oranye' ELSE 'Coklat'
    END as warna,
    2020 + (ABS(RANDOM()) % 6) as tahun_motor,
    date('2025-01-01', '+' || (ABS(RANDOM()) % 365) || ' days') as pajak_date,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 292) || ' days', '+' || (ABS(RANDOM()) % 24) || ' hours') as tanggal_masuk,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t1,
     (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t2
LIMIT 100;

-- Suzuki Motors (100 units)
INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
SELECT
    CASE (rowid % 5)
        WHEN 0 THEN 'Suzuki Nex II'
        WHEN 1 THEN 'Suzuki Address'
        WHEN 2 THEN 'Suzuki Satria F150'
        WHEN 3 THEN 'Suzuki GSX-R150'
        ELSE 'Suzuki GSX-S150'
    END as nama_motor,
    'B ' || (1000 + (ABS(RANDOM()) % 9000)) || ' ' ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) as nomor_polisi,
    'tersedia' as status,
    (10 + (ABS(RANDOM()) % 20)) * 1000000 as harga_modal,
    (12 + (ABS(RANDOM()) % 25)) * 1000000 as harga,
    CASE (ABS(RANDOM()) % 10)
        WHEN 0 THEN 'Hitam' WHEN 1 THEN 'Putih' WHEN 2 THEN 'Merah' WHEN 3 THEN 'Biru' WHEN 4 THEN 'Silver'
        WHEN 5 THEN 'Abu-abu' WHEN 6 THEN 'Kuning' WHEN 7 THEN 'Hijau' WHEN 8 THEN 'Oranye' ELSE 'Coklat'
    END as warna,
    2020 + (ABS(RANDOM()) % 6) as tahun_motor,
    date('2025-01-01', '+' || (ABS(RANDOM()) % 365) || ' days') as pajak_date,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 292) || ' days', '+' || (ABS(RANDOM()) % 24) || ' hours') as tanggal_masuk,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t1,
     (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t2
LIMIT 100;

-- Kawasaki & Vespa Motors (100 units)
INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
SELECT
    CASE (rowid % 10)
        WHEN 0 THEN 'Kawasaki Ninja 250'
        WHEN 1 THEN 'Kawasaki Z250'
        WHEN 2 THEN 'Kawasaki KLX 150'
        WHEN 3 THEN 'Kawasaki Versys 250'
        WHEN 4 THEN 'Kawasaki W175'
        WHEN 5 THEN 'Vespa Primavera'
        WHEN 6 THEN 'Vespa Sprint'
        WHEN 7 THEN 'Vespa GTS'
        WHEN 8 THEN 'Vespa LX'
        ELSE 'Vespa S'
    END as nama_motor,
    'B ' || (1000 + (ABS(RANDOM()) % 9000)) || ' ' ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) as nomor_polisi,
    'tersedia' as status,
    (10 + (ABS(RANDOM()) % 20)) * 1000000 as harga_modal,
    (12 + (ABS(RANDOM()) % 25)) * 1000000 as harga,
    CASE (ABS(RANDOM()) % 10)
        WHEN 0 THEN 'Hitam' WHEN 1 THEN 'Putih' WHEN 2 THEN 'Merah' WHEN 3 THEN 'Biru' WHEN 4 THEN 'Silver'
        WHEN 5 THEN 'Abu-abu' WHEN 6 THEN 'Kuning' WHEN 7 THEN 'Hijau' WHEN 8 THEN 'Oranye' ELSE 'Coklat'
    END as warna,
    2020 + (ABS(RANDOM()) % 6) as tahun_motor,
    date('2025-01-01', '+' || (ABS(RANDOM()) % 365) || ' days') as pajak_date,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 292) || ' days', '+' || (ABS(RANDOM()) % 24) || ' hours') as tanggal_masuk,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t1,
     (SELECT 1 as n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
      SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) t2
LIMIT 100;

COMMIT;

SELECT '✅ Successfully inserted 400 motors!' as status;
SELECT 'Total motors with status tersedia: ' || COUNT(*) FROM motors WHERE status = 'tersedia';

-- Script will continue in part 2 for transactions (to be executed separately due to complexity)
