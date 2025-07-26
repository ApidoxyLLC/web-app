'use client'

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, CloudDownloadIcon, Plus, Star, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "./ui/badge";
import SuperEllipse from "react-superellipse";
import Image from "next/image";
import CircularProgress from "./ui/circular-progress";


export default function AndroidBuild({apps}) {
    return(
        <Card>
            <CardHeader>
                <CardTitle>
                    <p className="text-sm font-semibold">App bundles</p>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full border rounded-md overflow-hidden">
                    <Table>
                        <TableBody>
                        {apps.map((app) => (
                            
                            <TableRow key={app.id} className="odd:bg-muted/50">
                                {console.log(app.icon)}
                                <TableCell className="flex gap-4 items-center">
                                    <SuperEllipse r1={0.15} r2={0.5} style={{width: 32, height: 32}}>
                                        <Image src={app?.icon} className="mask mask-squircle" width={32} height={32} alt=""/>
                                    </SuperEllipse>
                                    <span className="font-semibold text-sm">{app.nickname}</span>
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Badge variant="secondary">{app.version}</Badge>
                                </TableCell>
                                <TableCell>
                                    <CircularProgress
                                        value={app.builderStatus}
                                        size={40}
                                        strokeWidth={5}
                                        showLabel
                                        labelClassName="text-sm font-bold"
                                        className="w-6"
                                        renderLabel={(progress) => `${progress}%`}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" asChild disabled>
                                        <Link href={app.downloadUrl} download={true}>
                                            <CloudDownloadIcon />
                                            Download
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}