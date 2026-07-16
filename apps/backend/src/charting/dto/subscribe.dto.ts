import { IsIn, IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  symbol!: string;

  @IsIn(['spot', 'futures'])
  marketType: 'spot' | 'futures' = 'spot';
}
