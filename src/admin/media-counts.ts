import type { SubmissionStatus, SubmissionType } from '@prisma/client';

export type MediaCounts = {
  approvedPhotos: number;
  rejectedPhotos: number;
  pendingPhotos: number;
  approvedVideos: number;
  rejectedVideos: number;
  pendingVideos: number;
};

export function emptyMedia(): MediaCounts {
  return {
    approvedPhotos: 0,
    rejectedPhotos: 0,
    pendingPhotos: 0,
    approvedVideos: 0,
    rejectedVideos: 0,
    pendingVideos: 0,
  };
}

export function addMediaCount(
  bucket: MediaCounts,
  type: SubmissionType,
  status: SubmissionStatus,
  count: number,
) {
  if (type === 'PHOTO' && status === 'APPROVED') bucket.approvedPhotos += count;
  else if (type === 'PHOTO' && status === 'REJECTED') bucket.rejectedPhotos += count;
  else if (type === 'PHOTO' && status === 'PENDING') bucket.pendingPhotos += count;
  else if (type === 'VIDEO' && status === 'APPROVED') bucket.approvedVideos += count;
  else if (type === 'VIDEO' && status === 'REJECTED') bucket.rejectedVideos += count;
  else if (type === 'VIDEO' && status === 'PENDING') bucket.pendingVideos += count;
}
