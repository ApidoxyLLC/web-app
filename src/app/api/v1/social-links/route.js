import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { vendorModel } from "@/models/vendor/Vendor";
import socialLinksDTOSchema from "./socialLinkDTOSchema";



export async function POST(request, { params }) {
      // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json( { error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
    
    // Validate input first
    let body;
    try { body = await request.json(); 
        const parsed = socialLinksDTOSchema.safeParse(body);
        if (!parsed.success) 
            return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 } );

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) 
            return NextResponse.json( { error: authError || "Not authorized" }, { status: 401 } );    

        try {
              const { shop: referenceId, ...socialLinks } = parsed.data;
              const updatesArray = Object.entries(socialLinks)
                                        .map(([platform, link]) => ({ platform, link }));

              // Connect to databases
              const auth_db = await authDbConnect();
              const vendor_db = await vendorDbConnect();
              const Shop = shopModel(auth_db);
              const Vendor = vendorModel(vendor_db);

              // const pipeline = getSocialLinksUpdatePipeline(updatesArray);
              const pipeline = [  {
                                    $set: {
                                      socialLinks: {
                                        $let: {
                                          vars: {
                                            existingMap: {
                                              $arrayToObject: {
                                                $map: {
                                                  input: "$socialLinks",
                                                  as: "item",
                                                  in: ["$$item.platform", "$$item.link"]
                                                }
                                              }
                                            },
                                            updatesMap: {
                                              $arrayToObject: {
                                                $literal: updatesArray.map(({ platform, link }) => [platform, link])
                                              }
                                            }
                                          },
                                          in: {
                                            $map: {
                                              input: {
                                                $objectToArray: {
                                                  $mergeObjects: ["$$existingMap", "$$updatesMap"]
                                                }
                                              },
                                              as: "item",
                                              in: {
                                                platform: "$$item.k",
                                                link: "$$item.v"
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                ];
              const [updatedVendor, updatedShop] = await Promise.All([ Vendor.updateOne({ referenceId }, pipeline), 
                                                                         Shop.updateOne({ referenceId }, pipeline)])

              if (updatedVendor.modifiedCount === 0 && updatedShop.modifiedCount === 0) 
                  return NextResponse.json({ success: false, message: "No changes were made to social links" }, { status: 200 });

              return NextResponse.json({ success: true, message: "Social links updated successfully" }, { status: 200 });
          } catch (error) {
              return NextResponse.json({
                  error: error.message || "Failed to update social links",
                  stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }, { status: 500 });
          }

    } catch (error) {
        return NextResponse.json( { error: "Invalid JSON" },  { status: 400 } );
    } 
}

  const getSocialLinksUpdatePipeline = (updatesArray) => [
                                                          {
                                                            $set: {
                                                              socialLinks: {
                                                                $reduce: {
                                                                  input: updatesArray,
                                                                  initialValue: "$socialLinks",
                                                                  in: {
                                                                    $let: {
                                                                      vars: {
                                                                        filtered: {
                                                                          $filter: {
                                                                            input: "$$value",
                                                                            as: "item",
                                                                            cond: { $ne: ["$$item.platform", "$$this.platform"] }
                                                                          }
                                                                        }
                                                                      },
                                                                      in: {
                                                                        $concatArrays: [
                                                                          "$$filtered",
                                                                          [{ platform: "$$this.platform", link: "$$this.link" }]
                                                                        ]
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        ];

        // const vendor = await Vendor.findOne({ referenceId })
        //                            .select("_id ownerId socialLinks")
        //                            .lean();
        
        // if (!vendor) 
        //     return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

        // if (data?.userId.toString() !== vendor.ownerId?.toString()) 
        //     return NextResponse.json( { error: "Forbidden" }, { status: 403 } );
        

        // // Get shop (after verifying we have permission)
        // const shop = await Shop.findOne({ referenceId })
        //                        .select("_id socialLinks")
        //                        .lean();
        
        // if (!shop) 
        //     return NextResponse.json( { error: "Shop not found" }, { status: 404 } );

        // // Merge existing and new links
        // const mergedLinksMap = new Map();
        
        // // Add existing vendor links
        // (vendor.socialLinks || []).forEach(({ platform, link }) => { mergedLinksMap.set(platform, link) });
        // // Add/update with new links
        // updatesArray.forEach(({ platform, link }) => { mergedLinksMap.set(platform, link) });

        // const mergedLinksArray = Array.from(mergedLinksMap.entries())
        //                             .map(([platform, link]) => ({ platform, link }));

        // // Execute updates in parallel
        // const [vendorUpdate, shopUpdate] = await Promise.all([
        //     Vendor.updateOne({ _id: vendor._id }, { $set: { socialLinks: mergedLinksArray } } ),
        //     Shop.updateOne({ _id: shop._id }, { $set: { socialLinks: mergedLinksArray } })
        // ]);

        // if (vendorUpdate.modifiedCount === 0 && shopUpdate.modifiedCount === 0) 
        //     return NextResponse.json({ success: false, message: "No changes were made to social links" }, { status: 200 });


  
      /** 
   * fake Authentication for test purpose only 
   * *******************************************
   * *****REMOVE THIS BLOCK IN PRODUCTION***** *
   * *******************************************
   * *              ***
   * *              ***
   * *            *******
   * *             *****
   * *              *** 
   * *               *           
   * */

      // const authDb = await authDbConnect()
      // const User = userModel(authDb);
      // const user = await User.findOne({ referenceId: "cmda0m1db0000so9whatqavpx" })
      //   .select('referenceId _id name email phone role isEmailVerified')
      // console.log(user)
      // const userData = {
      //   sessionId: "cmdags8700000649w6qyzu8xx",
      //   userReferenceId: user.referenceId,
      //   userId: user?._id,
      //   name: user.name,
      //   email: user.email,
      //   phone: user.phone,
      //   role: user.role,
      //   isVerified: user.isEmailVerified || user.isPhoneVerified,
      // }

      /** 
       * fake Authentication for test purpose only 
       * *******************************************
       * *********FAKE AUTHENTICATION END********* *
       * *******************************************
      **/

        // const updatedVendor = await Vendor.updateOne({ _id: vendor._id },
      //                                               [
      //                                                 {
      //                                                   $set: {
      //                                                     socialLinks: {
      //                                                       $reduce: {
      //                                                         input: updatesArray,
      //                                                         initialValue: "$socialLinks",
      //                                                         in: {
      //                                                           $let: {
      //                                                             vars: {
      //                                                               filtered: {
      //                                                                 $filter: {
      //                                                                   input: "$$value",
      //                                                                   as: "item",
      //                                                                   cond: { $ne: ["$$item.platform", "$$this.platform"] }
      //                                                                 }
      //                                                               }
      //                                                             },
      //                                                             in: {
      //                                                               $concatArrays: [
      //                                                                 "$$filtered",
      //                                                                 [{ platform: "$$this.platform", link: "$$this.link" }]
      //                                                               ]
      //                                                             }
      //                                                           }
      //                                                         }
      //                                                       }
      //                                                     }
      //                                                   }
      //                                                 }
      //                                               ]
      //                                             );
                                                      
      // const updatedShop = await Shop.updateOne({ _id: shop._id },
      //                                           [
      //                                             {
      //                                               $set: {
      //                                                 socialLinks: {
      //                                                   $reduce: {
      //                                                     input: updatesArray,
      //                                                     initialValue: "$socialLinks",
      //                                                     in: {
      //                                                       $let: {
      //                                                         vars: {
      //                                                           filtered: {
      //                                                             $filter: {
      //                                                               input: "$$value",
      //                                                               as: "item",
      //                                                               cond: { $ne: ["$$item.platform", "$$this.platform"] }
      //                                                             }
      //                                                           }
      //                                                         },
      //                                                         in: {
      //                                                           $concatArrays: [
      //                                                             "$$filtered",
      //                                                             [{ platform: "$$this.platform", link: "$$this.link" }]
      //                                                           ]
      //                                                         }
      //                                                       }
      //                                                     }
      //                                                   }
      //                                                 }
      //                                               }
      //                                             }
      //                                           ]
      //                                         );

      // const pipeline = getSocialLinksUpdatePipeline(updatesArray);
      // const updatedVendor = await Vendor.updateOne({ _id: vendor._id }, pipeline);
      // const updatedShop = await Shop.updateOne({ _id: shop._id }, pipeline);


