# SOAP API — CRUD Buku Perpustakaan

Node.js + library `soap`, format data **XML (SOAP 1.1, document/literal)**, port **8000**.

## Menjalankan

```bash
npm install
npm start          # menjalankan server
npm run client     # (terminal lain) contoh client yang memanggil semua operasi
```

- Endpoint : `http://localhost:8000/soap/perpustakaan`
- WSDL     : `http://localhost:8000/soap/perpustakaan?wsdl` (kontraknya ada di `perpustakaan.wsdl`)

## Operasi

Semua request dikirim dengan `POST` ke **satu endpoint yang sama**. Operasi ditentukan oleh elemen di dalam `<soap:Body>` dan header `SOAPAction`.

| Operasi | Elemen request | Parameter |
|---|---|---|
| Ambil semua buku | `GetAllBukuRequest` | – |
| Ambil satu buku | `GetBukuByIdRequest` | `id` |
| Tambah buku | `CreateBukuRequest` | `judul, penulis, penerbit, tahunTerbit, isbn, stok` |
| Ubah buku | `UpdateBukuRequest` | `id` + field yang ingin diubah |
| Hapus buku | `DeleteBukuRequest` | `id` |

Error dikembalikan sebagai **SOAP Fault** (HTTP 500) dengan `faultcode` `soap:Client`.

## Contoh request (curl)

```bash
# READ semua
curl -X POST http://localhost:8000/soap/perpustakaan \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://perpustakaan.example.com/buku/GetAllBuku"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:buk="http://perpustakaan.example.com/buku">
        <soapenv:Body>
          <buk:GetAllBukuRequest/>
        </soapenv:Body>
      </soapenv:Envelope>'

# READ satu
curl -X POST http://localhost:8000/soap/perpustakaan \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://perpustakaan.example.com/buku/GetBukuById"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:buk="http://perpustakaan.example.com/buku">
        <soapenv:Body>
          <buk:GetBukuByIdRequest><buk:id>1</buk:id></buk:GetBukuByIdRequest>
        </soapenv:Body>
      </soapenv:Envelope>'

# CREATE
curl -X POST http://localhost:8000/soap/perpustakaan \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://perpustakaan.example.com/buku/CreateBuku"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:buk="http://perpustakaan.example.com/buku">
        <soapenv:Body>
          <buk:CreateBukuRequest>
            <buk:judul>Ronggeng Dukuh Paruk</buk:judul>
            <buk:penulis>Ahmad Tohari</buk:penulis>
            <buk:penerbit>Gramedia</buk:penerbit>
            <buk:tahunTerbit>1982</buk:tahunTerbit>
            <buk:isbn>9789792223477</buk:isbn>
            <buk:stok>2</buk:stok>
          </buk:CreateBukuRequest>
        </soapenv:Body>
      </soapenv:Envelope>'

# UPDATE
curl -X POST http://localhost:8000/soap/perpustakaan \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://perpustakaan.example.com/buku/UpdateBuku"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:buk="http://perpustakaan.example.com/buku">
        <soapenv:Body>
          <buk:UpdateBukuRequest><buk:id>4</buk:id><buk:stok>10</buk:stok></buk:UpdateBukuRequest>
        </soapenv:Body>
      </soapenv:Envelope>'

# DELETE
curl -X POST http://localhost:8000/soap/perpustakaan \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://perpustakaan.example.com/buku/DeleteBuku"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:buk="http://perpustakaan.example.com/buku">
        <soapenv:Body>
          <buk:DeleteBukuRequest><buk:id>4</buk:id></buk:DeleteBukuRequest>
        </soapenv:Body>
      </soapenv:Envelope>'
```

Bisa juga diuji dengan **SoapUI** atau **Postman**: import URL WSDL di atas, maka semua operasi otomatis muncul.

## Contoh respons

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBukuByIdResponse xmlns="http://perpustakaan.example.com/buku">
      <buku>
        <id>1</id>
        <judul>Laskar Pelangi</judul>
        <penulis>Andrea Hirata</penulis>
        <penerbit>Bentang Pustaka</penerbit>
        <tahunTerbit>2005</tahunTerbit>
        <isbn>9789793062792</isbn>
        <stok>5</stok>
      </buku>
    </GetBukuByIdResponse>
  </soap:Body>
</soap:Envelope>
```

Data disimpan di memori (`bukuStore.js`), jadi kembali ke data awal setiap server di-restart.
