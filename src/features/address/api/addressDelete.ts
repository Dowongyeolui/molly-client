'use server';

import {getValidAuthToken} from '@/shared/util/lib/authTokenValue';

export default async function addressDelete(addressId: number) {
  const authToken = getValidAuthToken();

  try {
    const res = await fetch(
      `${process.env.NEXT_SERVER_URL}/addresses/${addressId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `${authToken}`,
        },
      }
    );

    console.log('주소 삭제 아이디:', addressId);
    console.log('주소 삭제 여부:', res.status);
    if (!res.ok) {
      throw new Error('주소 정보를 삭제하는데 실패했습니다.');
    }

    return res.status;
  } catch (error) {
    console.error(error);
  }
}
