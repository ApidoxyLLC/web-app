import CredentialsProvider from 'next-auth/providers/credentials';
import { emailLoginSchema } from './loginDTOSchema';
import authDbConnect from '@/app/lib/mongodbConnections/authDbConnect';
import mongoose from 'mongoose';
import User from '@/app/models/auth/User';
import bcrypt from "bcryptjs";
// import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from "next-auth/providers/facebook";
// import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'EmailPasswordLogin',
            id: 'email-password-login',
            credentials: {
                email: { label: 'Email', type: 'text', placeholder: 'email' },
                password: { label: 'Password', type: 'password', placeholder: 'password' }
            },
            async authorize(credentials, req) {
                console.log('credentials', credentials);
                // const { email, password } = credentials;

                // if (!credentials?.email || !credentials?.password) {
                //         throw new Error("Email and password are required");
                //     }
                const parsed = emailLoginSchema.safeParse(credentials);
                  if (!parsed.success) {
                    throw new Error("Data not valid");
                    // return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
                  }

                const email = parsed.data.email?.trim();
                const password = parsed.data.password;

                if (!email && !password) {
                    throw new Error("Email and password are required");
                  } 
                authDbConnect()

                const user = await UserModel.findOne({ email: credentials.email })

                console.log(user)
            
                if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
                        throw new Error("Invalid credentials");
                    }
                    
                if (!user.isVerified) {
                    throw new Error("Please verify your email first");
                }







                // Apply emil + password logic here
                // 
                // Database user authentication example 
                // await dbConnect();
                // try {
                //     const user = await UserModel.findOne({
                //         $or: [
                //             { email:credentials.identifier},
                //             { username: credentials.identifier }
                //         ]
                //     })
                //     if (!user) {
                //         throw new Error('Authentication failed');
                //     }
                //     if(!user.isVerified){
                //         throw new Error('pls Verify your email');
                //     }
                //     const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password)
                //     if(!isPasswordCorrect) {
                //         throw new Error('Authentication failed');
                //     }
                // } catch (error) {
                //     throw new Error('Error connecting to the database');
                // }


                // Simulate a user database lookup


                return {
                    id: 1,
                    name: 'John Doe',
                    email: ''
                };
            },
        }),
        CredentialsProvider({
            name: 'Phone Login',
            id: 'phone-login',
            credentials: {
                phone: { label: 'Phone', type: 'text', placeholder: 'phone' },
                otp: { label: 'otp', type: 'text', placeholder: 'otp' }
            },
            async authorize(credentials, req) {
                console.log('credentials', credentials);
                const { phone, otp } = credentials;
                
                // Apply phone + otp logic here
                // 
                // await dbConnect();
                // try {
                //     const user = await UserModel.findOne({
                //         $or: [
                //             { email:credentials.identifier},
                //             { username: credentials.identifier }
                //         ]
                //     })
                //     if (!user) {
                //         throw new Error('Authentication failed');
                //     }
                //     if(!user.isVerified){
                //         throw new Error('pls Verify your email');
                //     }
                //     const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password)
                //     if(!isPasswordCorrect) {
                //         throw new Error('Authentication failed');
                //     }

                // } catch (error) {
                //     throw new Error('Error connecting to the database');
                // }

                // Simulate a user database lookup                            
                
                const user = {
                    id: 1,
                    name: 'John Doe',
                    email: ''
                };
                return user
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          }),
        AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET
          }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
          }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET
          })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token._id = user.id;
                token.email = user.email;
                token.isVerified  = user.isVerified;
            }
            return token;
        },
        async session({session, token}) {
            if(token){
                session.user._id = token._id;
                session.user.email = token.email;
                session.user.isVerified = token.isVerified;
            }
            session.user.id = token.id;
            return session;
        }
    },
    pages: {
        signIn: '/login',
        
        // error: '/auth/error' // Error code passed in query string as ?error=
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET
};
