import { useParams } from 'react-router-dom';
import MassiveMessagesStatus from '../MassiveMessagesStatus';

export const MassiveMessagesStatusWrapper = () => {
  const { jobId } = useParams();
  return <MassiveMessagesStatus jobId={jobId} />;
};
