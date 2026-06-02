import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Rol> {
    const rol = new Rol();
    rol.nombre_rol = createRoleDto.nombre_rol;
    rol.descripcion = createRoleDto.descripcion;
    return this.rolRepository.save(rol);
  }

  async findAll(): Promise<Rol[]> {
    return this.rolRepository.find();
  }

  async findOne(id: number): Promise<Rol | null> {
    return this.rolRepository.findOne({ where: { id_rol: id } });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Rol> {
    const rol = await this.findOne(id);
    if (!rol) {
      throw new Error(`Rol with id ${id} not found`);
    }
    rol.nombre_rol = updateRoleDto.nombre_rol ?? rol.nombre_rol;
    rol.descripcion = updateRoleDto.descripcion ?? rol.descripcion;
    return this.rolRepository.save(rol);
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);
    if (!rol) {
      throw new Error(`Rol with id ${id} not found`);
    }
    await this.rolRepository.remove(rol);
  }
}
