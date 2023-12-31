import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { compare, hash } from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { jwt_config } from 'src/config/config_jwt';
import { UpdateUserDto } from './dto/updateUser.dto';
import { isEmail } from 'class-validator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Register newUser
  // @param data
  // @returns

  generateJWT(payload: any) {
    return this.jwtService.sign(payload, {
      secret: jwt_config.secret,
      expiresIn: jwt_config.expired,
    });
  }

  async register(data: RegisterDto) {
    const checkUserExists = await this.prisma.users.findFirst({
      where: {
        email: data.email,
      },
    });
    if (checkUserExists) {
      throw new HttpException(
        `User ${data.email} already exists`,
        HttpStatus.FOUND,
      );
    }
    data.password = await hash(data.password, 12);
    const createUser = await this.prisma.users.create({
      data: data,
    });
    if (createUser) {
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Register Successfully',
      };
    }
  }

  async login(data: LoginDto) {
    const checkUser = await this.prisma.users.findFirst({
      where: {
        email: data.email,
      },
    });
    if (!checkUser) {
      throw new HttpException(
        `User ${data.email} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    const checkPassword = await compare(data.password, checkUser.password);

    if (checkPassword) {
      const accessToken = this.generateJWT({
        sub: checkUser.id,
        name: checkUser.name,
        email: checkUser.email,
        roles: checkUser.role,
      });
      return {
        statusCode: 200,
        name: checkUser.name,
        accessToken,
        message: 'Login Berhasil',
      };
    } else {
      throw new HttpException(
        'User or Password incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async update(user_id: number, data: UpdateUserDto) {
    // Validasi data sebelum diupdate
    if (!data || (data.email && !isEmail(data.email))) {
      throw new HttpException('Invalid data provided', HttpStatus.BAD_REQUEST);
    }
    data.password = await hash(data.password, 12);
    const updatedUser = await this.prisma.users.update({
      data: data,
      where: {
        id: user_id,
      },
    });
    return {
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  async profile(user_id: number) {
    try {
      const dataUser = await this.prisma.users.findFirst({
        where: {
          id: user_id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          tasks: true,
        },
      });

      if (dataUser) {
        return {
          statusCode: HttpStatus.OK,
          data: dataUser,
        };
      } else {
        throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      // Log the error for debugging purposes
      console.error(`Error in profile method: ${error.message}`);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadAvatar(user_id: number, avatar) {
    const checkUserExists = await this.prisma.users.findFirst({
      where: {
        id: user_id,
      },
    });
    if (checkUserExists) {
      const updateAvatar = await this.prisma.users.update({
        data: {
          avatar: avatar,
        },
        where: {
          id: user_id,
        },
      });
      if (updateAvatar) {
        return {
          statusCode: 200,
          message: 'Upload Avatar Success',
        };
      }
    }
    throw new HttpException(`Bad Request`, HttpStatus.BAD_REQUEST);
  }
}
