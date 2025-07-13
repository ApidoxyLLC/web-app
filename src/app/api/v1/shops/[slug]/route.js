import { NextResponse } from "next/server";
import { createShopDTOSchema } from "./createShopDTOSchema";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb/db";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { encrypt } from "@/lib/encryption/cryptoEncryption";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { userModel } from "@/models/auth/User";
import { vendorModel } from "@/models/vendor/Vendor";
import crypto from 'crypto'; 
import config from "../../../../../config";
import cuid from "@bugsnag/cuid";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";


export async function GET(request) {
  // Rate Limit
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
      const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getShop' });
      if (!allowed) return null;
  try {
    // Authenticate the user
    const { authenticated, error, data } = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
    // Pagination params (optional, default to page 1, limit 10)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    // Connect to the auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const { sessionId, userReferenceId, name, email, phone, role, isVerified, timezone, theme, language, currency } = data

    const result = await ShopModel.aggregate([ { $lookup: { 
                                                              from: "users",
                                                               let: { userReferenceId, sessionId, email },
                                                          pipeline: [ {
                                                                        $match: {
                                                                                    $expr: { $or: [ 
                                                                                                    { $eq: ["$referenceId", "$$userReferenceId"] },
                                                                                                    { $eq: ["$$email", "$email"] },
                                                                                                    { $in: ["$$sessionId", "$activeSessions"] },
                                                                                                  ] 
                                                                                                },
                                                                                isDeleted: false
                                                                              }
                                                                      },
                                                                      { $limit: 1 },
                                                                      { $project: { _id: 1 } }
                                                                    ],
                                                                as: "user"
                                                          }
                                                },
                                                { $match: {
                                                            $or: [ 
                                                                    {  $expr: { $eq: ["$ownerId", { $arrayElemAt: ["$user._id", 0] }] } },
                                                                    { stuffs: { $elemMatch: {
                                                                                              userId: { $eq: { $arrayElemAt: ["$user._id", 0] } }, 
                                                                                              status: "active"
                                                                                            } 
                                                                              } 
                                                                    } 
                                                                  ]
                                                          }
                                                },
                                                { $facet: {
                                                            shops: [ {    $skip: skip  },
                                                                     {   $limit: limit },
                                                                     { $project: { user: 0, __v: 0 } } ],
                                                            total: [{ $count: "count" }]
                                                          }
                                                },
                                                { $project: {
                                                                    shops: "$shops",
                                                                    total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                                                              currentPage: { $literal: page },
                                                               totalPages: {
                                                                            $ceil: {
                                                                                $divide: [
                                                                                            { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                                                                                            limit
                                                                                        ]
                                                                              }
                                                                           }
                                                            }
                                                },
                                                {
                                                  $addFields: {
                                                    nextPage: {
                                                      $cond: [{ $lt: [page, "$totalPages"] }, { $add: [page, 1] }, null]
                                                    },
                                                    prevPage: {
                                                      $cond: [{ $gt: [page, 1] }, { $subtract: [page, 1] }, null]
                                                    }
                                                  }
                                                }
                                              ]);

    const response = result[0] || {     shops: [],
                                        total: 0,
                                  currentPage: page,
                                   totalPages: 0,
                                     nextPage: null,
                                     prevPage: null   };

    return NextResponse.json({
      success: true,
      data: response.shops,
      total: response.total,
      currentPage: response.currentPage,
      totalPages: response.totalPages,
      nextPage: response.nextPage,
      prevPage: response.prevPage
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: error.message || "Failed to retrieve shop data",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}
