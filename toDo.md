lalu untuk pengambilan data masih lama apalagi ketika klik machine detail itu data yang ada di modal masih lama jadi buatkan agar pengambilannya cepat dengan metode yang sudah ada pada standard industri agar pengambilan datanya cepat

1. untuk halaman dashboard komponen defect by process itu data tablenya cukup ambil dari table "defect_by_process" dengan mengambil data berdasarkan line_id,line_process_id,dan juga shift_id. lalu sistem menampilkan semua process yang ada di line tersebut dan juga menampilkan semua process dengan berdasarkan defect nya. 

2. setelah implementasi pada komponen defect by process jangan lupa untuk mengintegrasikan data tersebut ke api /dashboard/summary agar request nya hanya 1 dan cepat. setelah anda mengimplementasi hal tersebut buat fungsi untuk mengintegrasikan websocket untuk semua matriks yang ada di dashboard seperti actual output, oee, troughput, cycle time, status machine, dan juga defect by process, setelah itu buat fungsi untuk api /dashboard/summary dengan websocket agar request apinya hanya 1 dan cepat. 

3. lalu buat logika untuk menampilkan data output berdasarkan pn, jadi jika user belum klik atau memilih pn maka sistem tidak dapat menampilkan data output dan semua data matriks yang ada di dashboard juga tidak dapat ditampilkan. data pn dapat dibaca dari table sn dengan mengambil part_number_id lalu mengambil data itemsnya.

4. pada halaman dashboard saya ingin sistem dapat melakukan filter otomatis untuk bagian shift agar menampilkan data outputnya sesuai, jadi jika shift 1->shift 2->shift 3-> jika sudah selesai shift 3 maka sistem akan menampilkan data output dari shift 1 lagi dengan data output yang baru dan tanggal yang sesuai atau bisa dibilang di reset dengan yang data baru.

5. Selanjutnya buatkan fungsi atau melakukan improvisasi pada machine management untuk bagian api /[id]/dashboard. pada api tersebut semua matriks yang ada di modal machine detail itu cukup request api 1 kali saja jadi semua data matriks dikirim ke api /[id]/dashboard setelah itu api tersebut yang mengirim ke front end agar request apinya hanya 1 dan cepat. hal ini agar pengambilan datanya cepat dan sama seperti pad api /dashboard/summary.









Notes: Gunakan pengambilan data yang sudah ada pada standard industri agar pengambilan datanya cepat contoh SWR untuk initial load dan jika ada update/insert data terbaru menggunakan websocket.