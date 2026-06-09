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

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}
