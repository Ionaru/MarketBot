/* tslint:disable:no-big-function */

import { WinstonPnPLogger } from 'winston-pnp-logger';

import { DataService } from '../services/data.service';
import { fetchUniverseType } from './api';

import mockAxios from '../__mocks__/axios';

new WinstonPnPLogger({announceSelf: false});

test('fetchUniverseType(34)', async () => {

  const expectedResult = {
    capacity: 0,
    description: 'snip',
    group_id: 18,
    icon_id: 22,
    market_group_id: 1857,
    mass: 0,
    name: 'Tritanium',
    packaged_volume: 0.01,
    portion_size: 1,
    published: true,
    radius: 1,
    type_id: 34,
    volume: 0.01,
  };

  mockAxios.get.mockImplementationOnce(() => Promise.resolve({
    data: expectedResult,
    headers: {},
    status: 200,
    statusText: 'OK',
  }));

  const result = await fetchUniverseType(34);

  expect(mockAxios.get).toHaveBeenCalledTimes(1);
  const url = 'https://esi.evetech.net/v3/universe/types/34';
  expect(mockAxios.get).toHaveBeenCalledWith('https://esi.evetech.net/v3/universe/types/34', DataService.getESIRequestConfig(url));
  expect(result).toBeTruthy();
  expect(result!.name).toEqual('Tritanium');
});
