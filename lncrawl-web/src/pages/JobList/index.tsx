import { JobStatus, type Job, type PaginatiedResponse } from '@/types';
import { stringifyError } from '@/utils/errors';
import { Button, Flex, List, Pagination, Result, Spin, Typography } from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { JobListItemCard } from './JobListItemCard';

const { Title } = Typography;

const PER_PAGE = 8;

export const JobListPage: React.FC<any> = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [refreshId, setRefreshId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [total, setTotal] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);

  const currentPage = useMemo(
    () => parseInt(searchParams.get('page') || '1', 10),
    [searchParams]
  );

  const shouldReload = useMemo(
    () =>
      Boolean(!error && jobs.find((job) => job.status != JobStatus.COMPLETED)),
    [error, jobs]
  );

  const fetchJobs = async (page: number) => {
    setError(undefined);
    try {
      const offset = (page - 1) * PER_PAGE;
      const { data } = await axios.get<PaginatiedResponse<Job>>('/api/jobs', {
        params: { offset, limit: PER_PAGE },
      });
      setTotal(data.total);
      setJobs(data.items);
    } catch (err: any) {
      setError(stringifyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage, refreshId]);

  useEffect(() => {
    if (currentPage === 1 && shouldReload) {
      const iid = setInterval(() => {
        setRefreshId((v) => v + 1);
      }, 5000);
      return () => clearInterval(iid);
    }
  }, [currentPage, shouldReload, refreshId]);

  const handlePageChange = (page: number) => {
    setLoading(true);
    setSearchParams({ page: String(page) });
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Spin tip="Loading job..." size="large" style={{ marginTop: 100 }} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%' }}>
        <Result
          status="error"
          title="Failed to load job list"
          subTitle={error}
          extra={[
            <Button
              onClick={() => {
                setLoading(true);
                setRefreshId((v) => v + 1);
              }}
            >
              Retry
            </Button>,
          ]}
        />
      </Flex>
    );
  }

  return (
    <>
      <Title level={2}>🛠 Job List</Title>

      <List
        itemLayout="horizontal"
        dataSource={jobs}
        renderItem={(job) => (
          <JobListItemCard
            job={job}
            onChange={() => setRefreshId((v) => v + 1)}
          />
        )}
      />

      {(jobs.length > 0 || currentPage > 1) && total / PER_PAGE > 1 && (
        <Pagination
          current={currentPage}
          total={total}
          pageSize={PER_PAGE}
          showSizeChanger={false}
          onChange={handlePageChange}
          style={{ textAlign: 'center', marginTop: 32 }}
        />
      )}
    </>
  );
};
