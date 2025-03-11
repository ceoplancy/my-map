import supabase from "@/config/supabaseClient"

export const convertQueryString = (queryString, mapLevel) => {
  let query = supabase.from("excel").select("*", { count: "exact" })

  if (queryString.status && queryString.status.length > 0) {
    query = query.in("status", queryString.status)
  }

  if (queryString.company && queryString.company.length > 0) {
    query = query.in("company", queryString.company)
  }

  if (queryString.startStocks && queryString.startStocks !== "") {
    query = query.gte("stocks", queryString.startStocks)
  }

  if (queryString.endStocks && queryString.endStocks !== "") {
    query = query.lte("stocks", queryString.endStocks)
  }

  // 위도, 경도 필터링 (지도의 확대 레벨에 따라 조정)
  if (
    queryString.lat !== "" &&
    queryString.lng !== "" &&
    queryString.lat &&
    queryString.lng
  ) {
    let latRange = 0
    let lngRange = 0

    switch (mapLevel) {
      case 1:
        latRange = 0.003
        lngRange = 0.003
        break
      case 2:
        latRange = 0.006
        lngRange = 0.006
        break
      case 3:
        latRange = 0.02
        lngRange = 0.02
        break
      case 4:
        latRange = 0.03
        lngRange = 0.03
        break
      case 5:
        latRange = 0.05
        lngRange = 0.05
        break
      case 6:
        latRange = 0.09
        lngRange = 0.09
        break
      case 7:
        latRange = 0.16
        lngRange = 0.16
        break
      case 8:
        latRange = 0.6
        lngRange = 0.6
        break
      case 9:
        latRange = 0.75
        lngRange = 0.75
        break
      case 10:
        latRange = 1
        lngRange = 1
        break
      case 11:
        latRange = 1.8
        lngRange = 1.8
        break
      case 12:
        latRange = 2.2
        lngRange = 2.2
        break
      default:
        latRange = 3
        lngRange = 3
    }

    query = query.gte("lat", queryString.lat - latRange)
    query = query.lte("lat", queryString.lat + latRange)
    query = query.gte("lng", queryString.lng - lngRange)
    query = query.lte("lng", queryString.lng + lngRange)
  }

  // if (
  //   queryString.lat !== '' &&
  //   queryString.lng !== '' &&
  //   queryString.lat &&
  //   queryString.lng &&
  //   mapLevel <= 7
  // ) {
  //   let latRange = 0;
  //   let lngRange = 0;

  //   // mapLevel 조건 수정
  //   if (mapLevel <= 7) {
  //     latRange = 0.05; // 맵 확대 레벨 7 이하
  //     lngRange = 0.05;
  //   } else if (mapLevel > 7 && mapLevel <= 10) {
  //     latRange = 0.07; // 맵 확대 레벨 8~10
  //     lngRange = 0.07;
  //   } else if (mapLevel > 10 && mapLevel <= 14) {
  //     latRange = 0.12; // 맵 확대 레벨 11~14
  //     lngRange = 0.1;
  //   } else {
  //     latRange = 0.2; // 맵 확대 레벨 15 이상 (최대 확대)
  //     lngRange = 0.2;
  //   }

  //   query = query.gte('lat', queryString.lat - latRange);
  //   query = query.lte('lat', queryString.lat + latRange);
  //   query = query.gte('lng', queryString.lng - lngRange);
  //   query = query.lte('lng', queryString.lng + lngRange);
  // }

  return query
}
