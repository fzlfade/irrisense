@echo off
rem Backend IrriSense sebagai server di laptop: jalankan terus, mulai ulang 10 detik setelah proses keluar.
rem Menangani Postgres Laragon yang belum siap saat Windows baru menyala, dan crash yang tidak terduga.
rem Dipanggil Task Scheduler saat login. Log: backend\data\server.log
cd /d "%~dp0.."
if not exist data mkdir data
:loop
echo [%date% %time%] start>> data\server.log
call npm start >> data\server.log 2>&1
echo [%date% %time%] berhenti (kode %errorlevel%), ulang dalam 10 detik>> data\server.log
rem ping, bukan timeout: timeout langsung gagal bila tidak ada konsol (Task Scheduler).
ping -n 11 127.0.0.1 > nul
goto loop
