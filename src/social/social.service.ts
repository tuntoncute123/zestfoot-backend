import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ReactPostDto } from './dto/react-post.dto';
import { CommentPostDto } from './dto/comment-post.dto';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPosts(limit: number = 20, userId?: string) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const where: any = {};
    if (userId) {
      where.user_id = userId;
    }

    const posts = await this.prisma.socialPost.findMany({
      where,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        reactions: true,
        comments: {
          orderBy: { created_at: 'asc' },
          include: {
            profile: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return posts.map((post) => ({
      id: post.id,
      user_id: post.user_id,
      caption: post.caption || '',
      image: post.image,
      created_at: post.created_at,
      profiles: {
        full_name: post.profile?.full_name || 'Sneakerhead',
        avatar_url: null,
      },
      social_reactions: post.reactions.map((r) => ({
        id: r.id,
        post_id: r.post_id,
        user_id: r.user_id,
        reaction_type: r.reaction_type,
        created_at: r.created_at,
      })),
      social_comments: post.comments.map((c) => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        profiles: {
          full_name: c.profile?.full_name || 'Sneakerhead',
          avatar_url: null,
        },
      })),
    }));
  }

  async createPost(dto: CreatePostDto) {
    let validUserId: string | null = null;
    if (dto.user_id) {
      try {
        const profile = await this.prisma.profile.findUnique({
          where: { id: dto.user_id },
        });
        if (profile) {
          validUserId = profile.id;
        }
      } catch (err) {
        this.logger.warn(`Could not lookup profile for user_id ${dto.user_id}: ${err.message}`);
      }
    }

    const post = await this.prisma.socialPost.create({
      data: {
        user_id: validUserId,
        caption: dto.caption || '',
        image: dto.image,
      },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: post.id,
      user_id: post.user_id,
      caption: post.caption || '',
      image: post.image,
      created_at: post.created_at,
      profiles: {
        full_name: post.profile?.full_name || 'Sneakerhead',
        avatar_url: null,
      },
      social_reactions: [],
      social_comments: [],
    };
  }

  async toggleReaction(postId: string, dto: ReactPostDto) {
    let validUserId: string | null = null;
    if (dto.user_id) {
      try {
        const profile = await this.prisma.profile.findUnique({
          where: { id: dto.user_id },
        });
        if (profile) validUserId = profile.id;
      } catch (_) {}
    }

    if (!validUserId) {
      return { success: false, message: 'Invalid user' };
    }

    const existing = await this.prisma.socialReaction.findFirst({
      where: {
        post_id: postId,
        user_id: validUserId,
      },
    });

    if (existing) {
      if (existing.reaction_type === dto.reaction_type) {
        await this.prisma.socialReaction.delete({
          where: { id: existing.id },
        });
        return { action: 'removed', id: existing.id };
      } else {
        const updated = await this.prisma.socialReaction.update({
          where: { id: existing.id },
          data: { reaction_type: dto.reaction_type },
        });
        return { action: 'updated', reaction: updated };
      }
    }

    const created = await this.prisma.socialReaction.create({
      data: {
        post_id: postId,
        user_id: validUserId,
        reaction_type: dto.reaction_type,
      },
    });

    return { action: 'created', reaction: created };
  }

  async addComment(postId: string, dto: CommentPostDto) {
    let validUserId: string | null = null;
    if (dto.user_id) {
      try {
        const profile = await this.prisma.profile.findUnique({
          where: { id: dto.user_id },
        });
        if (profile) validUserId = profile.id;
      } catch (_) {}
    }

    const comment = await this.prisma.socialComment.create({
      data: {
        post_id: postId,
        user_id: validUserId,
        content: dto.content,
      },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      profiles: {
        full_name: comment.profile?.full_name || 'Sneakerhead',
        avatar_url: null,
      },
    };
  }

  async deletePost(postId: string) {
    try {
      await this.prisma.socialComment.deleteMany({
        where: { post_id: postId },
      });
      await this.prisma.socialReaction.deleteMany({
        where: { post_id: postId },
      });
      await this.prisma.socialPost.delete({
        where: { id: postId },
      });
      return { success: true };
    } catch (error) {
      throw new NotFoundException(`Bài viết không tồn tại hoặc đã bị xóa.`);
    }
  }
}
