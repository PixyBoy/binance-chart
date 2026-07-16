import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
const MARKET_TYPES = ['spot', 'futures'] as const;

export class GetKlinesQueryDto {
  @IsString()
  symbol!: string;

  @IsOptional()
  @IsIn(MARKET_TYPES)
  marketType: 'spot' | 'futures' = 'spot';

  @IsIn(TIMEFRAMES)
  timeframe!: (typeof TIMEFRAMES)[number];

  @Type(() => Date)
  @IsDate()
  from!: Date;

  @Type(() => Date)
  @IsDate()
  to!: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}
