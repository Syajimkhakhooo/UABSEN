function geolocationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return 'Izin lokasi ditolak. Aktifkan akses lokasi di browser lalu coba lagi.';
    case 2:
      return 'Lokasi Anda belum bisa didapatkan. Pastikan GPS aktif dan sinyal cukup baik.';
    case 3:
      return 'Pengambilan lokasi terlalu lama. Coba lagi di area dengan sinyal GPS lebih baik.';
    default:
      return error?.message?.trim() || 'Lokasi Anda belum bisa didapatkan. Coba lagi sebentar.';
  }
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak mendukung geolocation.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => reject(new Error(geolocationErrorMessage(error))),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}
