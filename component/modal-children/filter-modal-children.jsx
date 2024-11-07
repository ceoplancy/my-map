import React from 'react';
import { useGetFilterMenu } from '@/api/supabase';
import Font from '@/component/font';
import Button from '@/component/button';
import styled from 'styled-components';

const FilterModalChildren = ({
  statusFilter, // status 선택 상태
  setStatusFilter, // status setState
  companyFilter, // company 선택 상태
  setCompanyFilter, // company setState
  setStocks, // stocs setState
  excelDataRefetch, // 엑셀 데이터 refetch
  completedFilterMakerDataRefetch, // 필터 완료된 데이터 refetch
  setIsFilterModalOpen, // 모달 열기/닫기 상태
}) => {
  const { data: filterMenu } = useGetFilterMenu();

  return (
    <>
      <Font fontSize="16px" margin="0 0 1.5rem 0">
        상태
      </Font>

      <FilterWrapper>
        {filterMenu?.statusMenu?.map((x) => {
          const isExist = statusFilter?.find((y) => y === x) || false;

          return (
            <li key={x}>
              <FilterLabel>
                <input
                  type="checkbox"
                  id={`status${x}`}
                  name={`status${x}`}
                  onChange={(e) => {
                    if (isExist) {
                      setStatusFilter(() =>
                        statusFilter.filter((k) => k !== x)
                      );
                    } else {
                      setStatusFilter((prev) => [...prev, x]);
                    }
                  }}
                  checked={isExist}
                />

                {x}
              </FilterLabel>
            </li>
          );
        })}
      </FilterWrapper>

      <Font fontSize="16px" margin="3.5rem 0 1.5rem 0">
        회사
      </Font>

      <FilterWrapper>
        {filterMenu?.companyMenu?.map((x) => {
          const isExist = companyFilter?.find((y) => y === x) || false;

          return (
            <li key={x}>
              <FilterLabel htmlFor={`company${x}`}>
                <input
                  type="checkbox"
                  id={`company${x}`}
                  name={`company${x}`}
                  onChange={(e) => {
                    if (isExist) {
                      setCompanyFilter(() =>
                        companyFilter.filter((k) => k !== x)
                      );
                    } else {
                      setCompanyFilter((prev) => [...prev, x]);
                    }
                  }}
                  checked={isExist}
                />
                {x}
              </FilterLabel>
            </li>
          );
        })}
      </FilterWrapper>

      <Font fontSize="16px" margin="3.5rem 0 1.5rem 0">
        주식수
      </Font>

      <FilterWrapper>
        <input
          type="number"
          onChange={(e) => {
            setStocks((prev) => {
              return {
                ...prev,
                start: e.target.value,
              };
            });
          }}
        />

        <Font fontSize="14px">~</Font>

        <input
          type="number"
          onChange={(e) => {
            setStocks((prev) => {
              return {
                ...prev,
                end: e.target.value,
              };
            });
          }}
        />
      </FilterWrapper>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          fontSize="16px"
          backgroundColor="#5599FF"
          border="1px solid #5599FF"
          borderRadius="5px"
          color="#fff"
          margin="3rem 0 0 0"
          cursor="pointer"
          onClick={() => {
            excelDataRefetch();
            completedFilterMakerDataRefetch();
            setIsFilterModalOpen(false);
          }}
        >
          확인
        </Button>
      </div>
    </>
  );
};

export default FilterModalChildren;

const FilterWrapper = styled.ul`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 14px;
`;
