import { GetServerSidePropsContext } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  picture: string | null;
  domain: string | null;
}

export async function requireServerAuth(context: GetServerSidePropsContext) {
  const { req } = context;
  const token = req.cookies.auth_token;

  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user: AuthUser = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      picture: decoded.picture || null,
      domain: decoded.domain || null,
    };

    return {
      props: {
        user,
      },
    };
  } catch (error) {
    // Invalid token, redirect to login
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

export async function optionalServerAuth(context: GetServerSidePropsContext) {
  const { req } = context;
  const token = req.cookies.auth_token;

  if (!token) {
    return {
      props: {
        user: null,
      },
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user: AuthUser = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      picture: decoded.picture || null,
      domain: decoded.domain || null,
    };

    return {
      props: {
        user,
      },
    };
  } catch (error) {
    return {
      props: {
        user: null,
      },
    };
  }
}