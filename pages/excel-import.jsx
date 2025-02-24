import { useState } from 'react';
import * as XLSX from 'xlsx';
import supabase from '@/config/supabaseClient';
import Font from '@/component/font';
import styled from 'styled-components';
import DotSpinner from '@/component/dot-spinner';

const ExcelImport = () => {
  const [failData, setFailData] = useState([]);
  const [failCount, setFailCount] = useState(0);
  const [excelFile, setExcelFile] = useState(null);
  const [typeError, setTypeError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

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
      setFileName(selectedFile.name);

      if (selectedFile && fileTypes.includes(selectedFile.type)) {
        setTypeError(null);
        let reader = new FileReader();
        reader.readAsArrayBuffer(selectedFile);
        reader.onload = (e) => {
          setExcelFile(e.target.result);
        };
      } else {
        setFileName('');
        setTypeError('Please select only excel file types');
        setExcelFile(null);
      }
    } else {
      console.log('Please select your file');
    }
  };

  const clearFileName = () => {
    setFileName('');
    setExcelFile(null);
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
      setLoading(true);

      try {
        const workbook = XLSX.read(excelFile, { type: 'buffer' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // delay 함수 정의
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Kakao Maps SDK 로드 확인 및 대기
        const waitForKakaoMaps = () => {
          return new Promise((resolve, reject) => {
            if (window.kakao?.maps?.services) {
              resolve();
            } else {
              const interval = setInterval(() => {
                if (window.kakao?.maps?.services) {
                  clearInterval(interval);
                  resolve();
                }
              }, 100);

              setTimeout(() => {
                clearInterval(interval);
                reject(new Error('Kakao Maps SDK 로드 실패'));
              }, 10000);
            }
          });
        };

        // SDK 로드 대기
        await waitForKakaoMaps();

        const geocoder = new window.kakao.maps.services.Geocoder();
        const result = [];

        const geocodeBatch = async (batchAddresses) => {
          const geocodingPromises = batchAddresses.map((x) => {
            return new Promise((resolve) => {
              geocoder.addressSearch(x.latlngaddress, function (k, status) {
                if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                  setFailData((prev) => [
                    ...prev,
                    { id: x.id, address: x.address },
                  ]);
                  setFailCount((prev) => prev + 1);
                  resolve();
                } else if (status === window.kakao.maps.services.Status.OK) {
                  result.push({
                    ...x,
                    lat: k[0].y.toString(),
                    lng: k[0].x.toString(),
                  });
                  resolve();
                } else {
                  // 에러 상태 처리
                  console.error('Geocoding error:', status);
                  setFailData((prev) => [
                    ...prev,
                    { id: x.id, address: x.address },
                  ]);
                  setFailCount((prev) => prev + 1);
                  resolve();
                }
              });
            });
          });

          await Promise.all(geocodingPromises);
        };

        const geocodeAddresses = async (addresses) => {
          const batchSize = 30; // 한 번에 보낼 주소의 갯수를 줄임
          const totalBatches = Math.ceil(addresses.length / batchSize);

          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * batchSize;
            const endIndex = Math.min(
              (batchIndex + 1) * batchSize,
              addresses.length
            );
            const batchAddresses = addresses.slice(startIndex, endIndex);

            await geocodeBatch(batchAddresses);

            // 작업중 - 딜레이를 2초로 줄임
            if (batchIndex < totalBatches - 1) {
              await delay(2000);
            }

            // 진행상황 로깅
            console.log(`Batch ${batchIndex + 1}/${totalBatches} completed`);
          }

          // 모든 작업이 끝난 후 결과 처리
          if (result.length !== addresses.length) {
            alert(
              '주소 변환에 실패한 주소가 있습니다. 수정 후 다시 업로드 해주세요.'
            );
            return result;
          }

          await supabase.from('excel').insert(result).select();
          alert('업로드 성공');
          return result;
        };

        // 주소 변환 후 DB업로드 실행
        await geocodeAddresses(data);
      } catch (error) {
        console.error('Error:', error);
        alert('주소 변환에 실패하였습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Frame>
      {loading && <DotSpinner />}
      <div>
        <Font fontSize="2.4rem" margin="4rem 0 0 0">
          엑셀 데이터 불러오기
        </Font>

        <div style={{ border: '1px solid #ccc', marginTop: '1rem' }}></div>
      </div>

      <StyledForm onSubmit={handleFileSubmit}>
        {fileName === '' && (
          <StyledLabel>
            <span>엑셀 파일 업로드 시 주소 변환 작업이 진행됩니다.</span>
            <StyledInput type="file" required onChange={handleFile} />
          </StyledLabel>
        )}

        {fileName && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Font fontSize="1.6rem" margin="1rem 0 0 0">
              {fileName}
            </Font>
            <span
              style={{
                marginLeft: '0.7rem',
                cursor: 'pointer',
                color: '#000',
                fontWeight: 'bold',
              }}
              onClick={clearFileName}
            >
              X
            </span>
          </div>
        )}

        <StyledButton type="submit">UPLOAD</StyledButton>
        {typeError && <div role="alert">{typeError}</div>}
      </StyledForm>

      {failCount > 0 && (
        <div
          style={{ border: '1px solid #ccc', margin: '3rem 0', width: '50%' }}
        ></div>
      )}

      {/* fail table */}
      {failCount > 0 && (
        <FailFrame>
          <FailWrapper>
            <Font fontSize="2rem">주소 변환 실패 갯수 : {failCount}</Font>

            <StyledExportButton onClick={() => handleExport()}>
              export
            </StyledExportButton>
          </FailWrapper>
        </FailFrame>
      )}

      {failCount > 0 && (
        <FailFrame>
          <table style={{ marginTop: '2rem' }}>
            <thead>
              <tr>
                <StyledTh>상태</StyledTh>
                <StyledTh>검색ID</StyledTh>
                <StyledTh>변환실패주소</StyledTh>
              </tr>
            </thead>

            <tbody>
              {failData?.map((x, index) => (
                <tr key={index}>
                  <StyledTd>실패</StyledTd>
                  <StyledTd>{x.id}</StyledTd>
                  <StyledTd>{x.address}</StyledTd>
                </tr>
              ))}
            </tbody>
          </table>
        </FailFrame>
      )}
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
`;

const FailWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 3rem;
  margin-top: 2rem;
`;

const StyledTh = styled.th`
  padding: 1rem;
  font-size: 2rem;
  text-align: center;
  border: 1px solid #ccc;
`;

const StyledTd = styled.td`
  padding: 1rem;
  font-size: 2rem;
  text-align: center;
  border: 1px solid #ccc;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  background-color: #f0f8ff;
  border: 2px dashed #000;
  border-radius: 10px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  text-align: center;
`;

const StyledInput = styled.input`
  display: none;
`;

const StyledLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  padding: 1rem;
  border: 2px solid #000;
  border-radius: 10px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #e6f7ff;
  }
`;

const StyledButton = styled.button`
  margin-top: 2rem;
  padding: 0.5rem 1rem;
  background-color: #000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
`;

const StyledExportButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
`;
