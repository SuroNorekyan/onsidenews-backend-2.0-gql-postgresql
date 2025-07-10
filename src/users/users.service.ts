//src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user-entities/user.entity';
import { CreateUserInput } from './user-dto/create-user.input';
import { UpdateUserInput } from './user-dto/update-user.input';
import { UserFilterInput } from './user-dto/user-filter.input';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  create(createUserInput: CreateUserInput): Promise<User> {
    const user = this.userRepository.create(createUserInput);
    return this.userRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['comments', 'posts'],
    });
  }

  async findAll(filter?: UserFilterInput): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (filter?.role)
      query.andWhere('user.role = :role', { role: filter.role });
    if (filter?.username)
      query.andWhere('user.username ILIKE :username', {
        username: `%${filter.username}%`,
      });

    if (filter?.sortByUsername)
      query.addOrderBy('user.username', filter.sortByUsername);
    if (filter?.sortByDateOfBirth)
      query.addOrderBy('user.dateOfBirth', filter.sortByDateOfBirth);
    if (filter?.sortByCreatedAt)
      query.addOrderBy('user.createdAt', filter.sortByCreatedAt);

    return query.getMany();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userId: id },
      relations: ['comments', 'posts'],
    });
  }

  async update(id: number, input: UpdateUserInput): Promise<User | null> {
    await this.userRepository.update(id, input);
    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    await this.userRepository.delete(id);
    return true;
  }
}
