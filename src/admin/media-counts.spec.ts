import { addMediaCount, emptyMedia } from './media-counts';

describe('addMediaCount', () => {
  it('tallies approved and rejected photos and videos separately', () => {
    const bucket = emptyMedia();
    addMediaCount(bucket, 'PHOTO', 'APPROVED', 4);
    addMediaCount(bucket, 'PHOTO', 'REJECTED', 1);
    addMediaCount(bucket, 'VIDEO', 'APPROVED', 2);
    addMediaCount(bucket, 'VIDEO', 'REJECTED', 3);
    addMediaCount(bucket, 'PHOTO', 'PENDING', 5);
    expect(bucket).toEqual({
      approvedPhotos: 4,
      rejectedPhotos: 1,
      pendingPhotos: 5,
      approvedVideos: 2,
      rejectedVideos: 3,
      pendingVideos: 0,
    });
  });
});
