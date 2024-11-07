import { useState } from 'react';
import * as XLSX from 'xlsx';
import supabase from '@/config/supabaseClient';
import Font from '@/component/font';
import styled from 'styled-components';

const ExcelImport = () => {
  const [failData, setFailData] = useState([]);
  const [failCount, setFailCount] = useState(0);
  const [excelFile, setExcelFile] = useState(null);
  const [typeError, setTypeError] = useState(null);

  const convertToExportArray = (arr) => {
    const result = [];

    // 헤더 행 추가
    const headers = Object.keys(arr[0]);
    result.push(headers);

    // 데이터 행 추가
    arr.forEach((item) => {
      const row = headers.map((header) => item[header]);
      result.push(row);
    });

    return result;
  };

  const handleFile = (e) => {
    let fileTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    let selectedFile = e.target.files[0];

    if (selectedFile) {
      if (selectedFile && fileTypes.includes(selectedFile.type)) {
        setTypeError(null);
        let reader = new FileReader();
        reader.readAsArrayBuffer(selectedFile);
        reader.onload = (e) => {
          setExcelFile(e.target.result);
        };
      } else {
        setTypeError('Please select only excel file types');
        setExcelFile(null);
      }
    } else {
      console.log('Please select your file');
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(convertToExportArray(failData));

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = '주소변환실패현황.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();

    if (excelFile !== null) {
      const workbook = XLSX.read(excelFile, { type: 'buffer' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      // setExcelData(data.slice(0, 10));

      window.kakao.maps.load();
      const geocoder = new window.kakao.maps.services.Geocoder();
      const result = [];

      const delay = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      const geocodeBatch = async (batchAddresses) => {
        const geocodingPromises = batchAddresses.map((x) => {
          return new Promise((resolve) => {
            geocoder.addressSearch(x.latlngaddress, function (k, status) {
              if (status === 'ZERO_RESULT') {
                setFailData((prev) => [
                  ...prev,
                  { id: x.id, address: x.address },
                ]);
                setFailCount((prev) => prev + 1);
              }

              if (status === window.kakao.maps.services.Status.OK) {
                result.push({
                  ...x,
                  lat: k[0].y.toString(),
                  lng: k[0].x.toString(),
                });
              }

              resolve();
            });
          });
        });

        // 모든 주소 검색 작업이 완료될 때까지 기다립니다.
        await Promise.all(geocodingPromises);
      };

      const geocodeAddresses = async (addresses) => {
        const batchSize = 200; // 한 번에 보낼 주소의 갯수
        const totalBatches = Math.ceil(addresses.length / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * batchSize;
          const endIndex = Math.min(
            (batchIndex + 1) * batchSize,
            addresses.length
          );

          const batchAddresses = addresses.slice(startIndex, endIndex);

          await geocodeBatch(batchAddresses);

          // 작업중
          if (batchIndex < totalBatches - 1) {
            await delay(10000);
          }

          // 모든 작업이 끝나면
          if (batchIndex >= totalBatches - 1) {
            // 최초 업로드한 배열의 길이와 작업 후의 배열의 길이가 다르면 DB 업로드 X
            if (result.length !== addresses.length) {
              alert(
                '주소 변환에 실패한 주소가 있습니다. 수정 후 다시 업로드 해주세요.'
              );
              return;
            }

            // 최초 업로드한 배열의 길이와 작업 후의 배열의 길이가 같으면 DB 업로드 O
            if (result.length === addresses.length) {
              await supabase.from('excel').insert(result).select();
              alert('업로드 성공');
              return;
            }
          }
        }

        return result;
      };

      // 주소 변환 후 DB업로드 실행
      await geocodeAddresses(data);
    }
  };

  return (
    <Frame>
      <form onSubmit={handleFileSubmit}>
        <input type="file" required onChange={handleFile} />

        <button type="submit">UPLOAD</button>

        {typeError && <div role="alert">{typeError}</div>}
      </form>

      <FailFrame>
        {failCount > 0 && (
          <FailWrapper>
            <Font fontSize="2rem">주소 변환 실패 갯수</Font>
            <Font fontSize="2rem">{failCount}</Font>
            <Font
              fontSize="2rem"
              cursor="pointer"
              onClick={() => handleExport()}
            >
              export
            </Font>
          </FailWrapper>
        )}
      </FailFrame>

      <FailFrame>
        {failData?.map((x, index) => {
          return (
            <FailWrapper key={index}>
              <Font fontSize="2rem">실패</Font>
              <Font fontSize="2rem">{x.id}</Font>
              <Font fontSize="2rem">{x.address}</Font>
            </FailWrapper>
          );
        })}
      </FailFrame>

      {/* <div className="viewer">
        {excelData ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(excelData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {excelData.map((individualExcelData, index) => (
                  <tr key={index}>
                    {Object.keys(individualExcelData).map((key) => (
                      <td key={key}>{individualExcelData[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>No File is uploaded yet!</div>
        )}
      </div> */}
    </Frame>
  );
};

export default ExcelImport;

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
`;

const FailFrame = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 4rem;
`;

const FailWrapper = styled.div`
  display: flex;
  gap: 3rem;
  margin-top: 1rem;
`;
