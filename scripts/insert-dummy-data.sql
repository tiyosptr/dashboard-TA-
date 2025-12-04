-- SQL Script untuk Insert Dummy Data ke Supabase
-- Jalankan di Supabase SQL Editor

-- ============================================
-- INSERT DATA_ITEMS
-- ============================================

-- PN123 - Line A - Jam 07:00-11:00
INSERT INTO public.data_items (sn, pn, wo, name_line, line_id, name_process, status, created_at) VALUES
('SN-PN123-001', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 07:15:00+00'),
('SN-PN123-002', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 07:30:00+00'),
('SN-PN123-003', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'pass', '2024-11-28 07:45:00+00'),
('SN-PN123-004', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'reject', '2024-11-28 07:50:00+00'),

('SN-PN123-005', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 08:10:00+00'),
('SN-PN123-006', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 08:25:00+00'),
('SN-PN123-007', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'pass', '2024-11-28 08:40:00+00'),
('SN-PN123-008', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Packaging', 'pass', '2024-11-28 08:55:00+00'),

('SN-PN123-009', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 09:15:00+00'),
('SN-PN123-010', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 09:30:00+00'),
('SN-PN123-011', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'reject', '2024-11-28 09:45:00+00'),

('SN-PN123-012', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 10:10:00+00'),
('SN-PN123-013', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'pass', '2024-11-28 10:30:00+00'),
('SN-PN123-014', 'PN123', 'WO2024001', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Packaging', 'reject', '2024-11-28 10:50:00+00'),

-- PN456 - Line C - Jam 11:00-13:00
('SN-PN456-001', 'PN456', 'WO2024003', 'Line C', 'c3d4e5f6-a7b8-4901-c234-345678901abc', 'Assembly', 'pass', '2024-11-28 11:15:00+00'),
('SN-PN456-002', 'PN456', 'WO2024003', 'Line C', 'c3d4e5f6-a7b8-4901-c234-345678901abc', 'Assembly', 'pass', '2024-11-28 11:30:00+00'),
('SN-PN456-003', 'PN456', 'WO2024003', 'Line C', 'c3d4e5f6-a7b8-4901-c234-345678901abc', 'Testing', 'pass', '2024-11-28 11:45:00+00'),

('SN-PN456-004', 'PN456', 'WO2024003', 'Line C', 'c3d4e5f6-a7b8-4901-c234-345678901abc', 'Assembly', 'pass', '2024-11-28 12:10:00+00'),
('SN-PN456-005', 'PN456', 'WO2024003', 'Line C', 'c3d4e5f6-a7b8-4901-c234-345678901abc', 'Testing', 'pass', '2024-11-28 12:30:00+00'),

-- PN1234 - Line B - Jam 13:00-14:00 (Mostly rejects)
('SN-PN1234-001', 'PN1234', 'WO2024002', 'Line B', 'b2c3d4e5-f6a7-4890-b123-234567890def', 'Assembly', 'reject', '2024-11-28 13:15:00+00'),
('SN-PN1234-002', 'PN1234', 'WO2024002', 'Line B', 'b2c3d4e5-f6a7-4890-b123-234567890def', 'Assembly', 'reject', '2024-11-28 13:30:00+00'),
('SN-PN1234-003', 'PN1234', 'WO2024002', 'Line B', 'b2c3d4e5-f6a7-4890-b123-234567890def', 'Testing', 'reject', '2024-11-28 13:45:00+00'),
('SN-PN1234-004', 'PN1234', 'WO2024002', 'Line B', 'b2c3d4e5-f6a7-4890-b123-234567890def', 'Testing', 'pass', '2024-11-28 13:50:00+00'),

-- PN789 - Line A - Jam 14:00-16:00 (Mixed)
('SN-PN789-001', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 14:10:00+00'),
('SN-PN789-002', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'reject', '2024-11-28 14:25:00+00'),
('SN-PN789-003', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'pass', '2024-11-28 14:40:00+00'),
('SN-PN789-004', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Packaging', 'reject', '2024-11-28 14:55:00+00'),

('SN-PN789-005', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Assembly', 'pass', '2024-11-28 15:10:00+00'),
('SN-PN789-006', 'PN789', 'WO2024004', 'Line A', 'a1b2c3d4-e5f6-4789-a012-123456789abc', 'Testing', 'pass', '2024-11-28 15:30:00+00')

ON CONFLICT (sn) DO NOTHING;

-- ============================================
-- INSERT ACTUAL_OUTPUT (Aggregated Results)
-- ============================================

-- Hapus data lama jika ada (optional)
-- DELETE FROM public.actual_output WHERE date = '2024-11-28';

-- Insert aggregated actual output
INSERT INTO public.actual_output (line_id, shift_number, hour_slot, date, pn, output, reject, target_output) VALUES
-- PN123 - Line A
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '07:00-08:00', '2024-11-28', 'PN123', 3, 1, 1000),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '08:00-09:00', '2024-11-28', 'PN123', 4, 0, 1000),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '09:00-10:00', '2024-11-28', 'PN123', 2, 1, 1000),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '10:00-11:00', '2024-11-28', 'PN123', 2, 1, 1000),

-- PN456 - Line C
('c3d4e5f6-a7b8-4901-c234-345678901abc', 1, '11:00-12:00', '2024-11-28', 'PN456', 3, 0, 1000),
('c3d4e5f6-a7b8-4901-c234-345678901abc', 1, '12:00-13:00', '2024-11-28', 'PN456', 2, 0, 1000),

-- PN1234 - Line B
('b2c3d4e5-f6a7-4890-b123-234567890def', 1, '13:00-14:00', '2024-11-28', 'PN1234', 1, 3, 1000),

-- PN789 - Line A
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '14:00-15:00', '2024-11-28', 'PN789', 2, 2, 1000),
('a1b2c3d4-e5f6-4789-a012-123456789abc', 1, '15:00-16:00', '2024-11-28', 'PN789', 2, 0, 1000)

ON CONFLICT (line_id, shift_number, hour_slot, date, pn) DO UPDATE SET
  output = EXCLUDED.output,
  reject = EXCLUDED.reject,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check data_items count
SELECT 
  pn, 
  status, 
  COUNT(*) as count 
FROM public.data_items 
WHERE created_at::date = '2024-11-28'
GROUP BY pn, status 
ORDER BY pn, status;

-- Check actual_output aggregation
SELECT 
  pn,
  hour_slot,
  output,
  reject,
  (output + reject) as total
FROM public.actual_output
WHERE date = '2024-11-28'
ORDER BY pn, hour_slot;

-- Summary by PN
SELECT 
  pn,
  SUM(output) as total_output,
  SUM(reject) as total_reject,
  SUM(output + reject) as total_items
FROM public.actual_output
WHERE date = '2024-11-28'
GROUP BY pn
ORDER BY pn;
