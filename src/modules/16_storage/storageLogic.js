export function isStorageItemForDistrict(item, districtName) {
  return String(item?.district || "") === String(districtName || "");
}

export function getStorageItemSummary(items, districtName) {
  return (Array.isArray(items) ? items : []).filter((item) => isStorageItemForDistrict(item, districtName));
}
