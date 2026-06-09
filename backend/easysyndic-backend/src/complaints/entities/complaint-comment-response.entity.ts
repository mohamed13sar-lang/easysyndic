import { ApiProperty } from '@nestjs/swagger';

export class ComplaintCommentResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  complaintId!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  comment!: string;
  @ApiProperty()
  isInternal!: boolean;
  @ApiProperty()
  createdAt!: Date;
}
