"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "@/components/ui/select";
import RSPVInput from "@/components/rspv-input";

import {
  ControlGroup,
  ControlGroupItem,
} from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import * as SelectPrimitive from "@radix-ui/react-select";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Trash2 } from "lucide-react";
import pathao from "../../../../../public/images/pathao.png";
import steadfast from "../../../../../public/images/steadfast.png";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "sonner";
const markets = {
  bd: {
    name: "Bangladesh",
    address: [
      {
        name: "Address line 1",
        tpes: "text",
        suggesions: [],
        isRequired: true,
      },
      {
        name: "Address line 2",
        tpes: "text",
        suggesions: [],
        isRequired: true,
      },
    ],
    points: [
      {
        name: "Zones",
        key: "zone",
        type: "text",
        suzzestions: [],
        regex: "",
      },
      {
        name: "Upazilla",
        key: "up",
        type: "select",
        suzzestions: [
          {
            key: "up-1",
            value: "Upazilla 1",
          },
          {
            key: "up-2",
            value: "Upazilla 2",
          },
        ],
        regex: "",
      },
      {
        name: "Districts",
        key: "dis",
        type: "select",
        suzzestions: [
          {
            key: "up-1",
            value: "Upazilla 1",
          },
          {
            key: "up-2",
            value: "Upazilla 2",
          },
        ],
        regex: "",
      },
    ],
    gateway: [
      {
        name: "Pathao",
        shortCode: "pathao",
        logo: pathao,
        fields: [
          {
            name: "Client ID",
            key: "clientId",
            required: true,
            regex: "",
            type: "text",
            suggestions: [],
          },
          {
            name: "Client Secret",
            key: "clientSecret",
            type: "password",
            required: true,
            regex: "",
            suggestions: [],
          },
          {
            name: "Username",
            key: "username",
            type: "text",
            required: true,
            regex: "",
            suggestions: [],
          },
          {
            name: "Password",
            key: "password",
            type: "password",
            required: true,
            regex: "",
            suggestions: [],
          },
        ],
      },
      {
        name: "Steadfast",
        shortCode: "steadfast",
        logo: steadfast,
        fields: [
          {
            name: "API Key",
            key: "apiKey",
            required: true,
            regex: "",
            type: "text",
            suggestions: [],
          },
          {
            name: "API Secret",
            key: "apiSecret",
            required: true,
            regex: "",
            type: "password",
            suggestions: [],
          },
        ],
      },
    ],
  },
};

export default function DeliverySettings() {
  const [refundable, setRefundable] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [deliveryOptions, setDelivaryOptions] = useState("districts");
  const [zoneInput, setZoneInput] = useState({ name: "", charge: "" });
  const [zonesList, setZonesList] = useState([]);
  const [districtInput, setDistrictInput] = useState({ name: "", charge: "" });
  const [districtsList, setDistrictsList] = useState([]);
  const [upazilaInput, setUpazilaInput] = useState({ name: "", charge: "" });
  const [upazilasList, setUpazilasList] = useState([]);
  const [country, setCountry] = useState(markets.bd);
  const [courierForm, setCourierForm] = useState({}); // Example: "Pathao" or "Steadfast"
  const {shop}=useParams()


  const handleCourierSubmit = async () => {

  const payload = {
    partner: selectedCourier?.toLowerCase(),
    shop: shop,
    ...courierForm
  };
  console.log(payload)

  try {
    const res = await fetch(`/api/v1/delivery-partner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok) {
      toast.success("Courier credentials updated!");
      setCourierForm({});
    } else {
      toast.error(result?.error || "Failed to update");
    }
  } catch (err) {
    console.error(err);
    toast.error("An error occurred.");
  }
};

  return (
    <div className=" w-full mx-auto p-6 space-y-6 bg-muted/100">
      <Card >
        <CardContent className="flex justify-between gap-6 px-6 items-center">
          <Label className="text-md font-semibold">Select Country</Label>
          <Select
            onValueChange={(val) => {
              setCountry(markets[val]);
              console.log(country.points);
            }}
          >
            <SelectPrimitive.Trigger
              className={cn(
                "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                "w-44"
              )}
            >
              <SelectValue placeholder="Select a country" />
              <SelectPrimitive.Icon asChild>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Country</SelectLabel>
                <SelectItem value="bd">Bangladesh</SelectItem>
                <SelectItem value="my" disabled>
                  Malaysia
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <Label className="text-md font-semibold">
            Delivery Charge (Default)
          </Label>
          <ControlGroup className="w-full h-10">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Charge</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      placeholder="Delivery charge"
                      // onChange={(e) => setNewCategory(prev => ({
                      //   ...prev,
                      //   title: e.target.value,
                      // }))}
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-md font-semibold">
                Delivery Charge not refundable?
              </Label>
              <Switch
                checked={!refundable}
                onCheckedChange={() => setRefundable(!refundable)}
              />
            </div>
            {refundable && (
              <p className="text-sm pt-1 text-gray-500">
                Enabling this option ensures if you return a order the delivery
                charge will not be refunded.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-md font-semibold">Delivery option:</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div>
                {country.points.map((point) => (
                  <Button
                    key={point.key}
                    variant="outline"
                    onClick={() =>
                      setDelivaryOptions(point.name.toLocaleLowerCase())
                    }
                    className="rounded-none first:rounded-l-md last:rounded-r-md"
                  >
                    {point.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm ">Specific Delivery Charges:</p>
          {deliveryOptions == "zones" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-6">
                
                <ControlGroup className="w-full h-10">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Zones</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      placeholder="Delivery Zones"
                      onChange={(e) =>
                      setZoneInput({ ...zoneInput, name: e.target.value })
                  }
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
                
                <ControlGroup className="w-full h-10">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Charge</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      placeholder="Delivery charge"
                     onChange={(e) =>
                    setZoneInput({
                      ...zoneInput,
                      charge: e.target.value,
                    })
                  }
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
                <Button
                  onClick={() => setZonesList([...zonesList, zoneInput])}
                  variant="outline"
                  className="h-10"
                >
                  Add <span className="text-xl">+</span>
                </Button>
              </div>
              <div className="">
                {zonesList.map((zone, index) => (
                  <div key={index} className="flex items-center gap-6 h-full">
                    <div className="w-full pl-3 py-2 border rounded-md">
                      {zone.name}
                    </div>
                    <div className="w-full pl-3 py-2 border rounded-md">
                      {zone.charge}
                    </div>
                    <Button
                      variant="destructive"
                      className="flex items-center gap-2 w-20 h-10"
                      onClick={() => {
                        const updated = zonesList.filter((_, i) => i !== index);
                        setZonesList(updated);
                      }}
                    >
                      Del
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {deliveryOptions == "districts" && (
            <div>
              <div className="flex flex-col md:flex-row gap-6 pb-6">
                <Select
                  onValueChange={(val) => {
                    setDistrictInput({ ...districtInput, name: val });
                  }}
                >
                  <SelectPrimitive.Trigger
                    className={cn(
                      "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                      "w-full"
                    )}
                  >
                    <SelectValue placeholder="Select districts" />
                    <SelectPrimitive.Icon asChild>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </SelectPrimitive.Icon>
                  </SelectPrimitive.Trigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Districts</SelectLabel>
                      <SelectItem value="Barguna">Barguna</SelectItem>
                      <SelectItem value="Barisal">Barisal</SelectItem>
                      <SelectItem value="Bhola">Bhola</SelectItem>
                      <SelectItem value="Jhalokati">Jhalokati</SelectItem>
                      <SelectItem value="Patuakhali">Patuakhali</SelectItem>
                      <SelectItem value="Pirojpur">Pirojpur</SelectItem>

                      <SelectItem value="Bandarban">Bandarban</SelectItem>
                      <SelectItem value="Brahmanbaria">Brahmanbaria</SelectItem>
                      <SelectItem value="Chandpur">Chandpur</SelectItem>
                      <SelectItem value="Chittagong">Chittagong</SelectItem>
                      <SelectItem value="Comilla">Comilla</SelectItem>
                      <SelectItem value="Cox's Bazar">Cox's Bazar</SelectItem>
                      <SelectItem value="Feni">Feni</SelectItem>
                      <SelectItem value="Khagrachari">Khagrachari</SelectItem>
                      <SelectItem value="Lakshmipur">Lakshmipur</SelectItem>
                      <SelectItem value="Noakhali">Noakhali</SelectItem>
                      <SelectItem value="Rangamati">Rangamati</SelectItem>

                      <SelectItem value="Dhaka">Dhaka</SelectItem>
                      <SelectItem value="Faridpur">Faridpur</SelectItem>
                      <SelectItem value="Gazipur">Gazipur</SelectItem>
                      <SelectItem value="Gopalganj">Gopalganj</SelectItem>
                      <SelectItem value="Kishoreganj">Kishoreganj</SelectItem>
                      <SelectItem value="Madaripur">Madaripur</SelectItem>
                      <SelectItem value="Manikganj">Manikganj</SelectItem>
                      <SelectItem value="Munshiganj">Munshiganj</SelectItem>
                      <SelectItem value="Narayanganj">Narayanganj</SelectItem>
                      <SelectItem value="Narsingdi">Narsingdi</SelectItem>
                      <SelectItem value="Rajbari">Rajbari</SelectItem>
                      <SelectItem value="Shariatpur">Shariatpur</SelectItem>
                      <SelectItem value="Tangail">Tangail</SelectItem>

                      <SelectItem value="Bagerhat">Bagerhat</SelectItem>
                      <SelectItem value="Chuadanga">Chuadanga</SelectItem>
                      <SelectItem value="Jessore">Jessore</SelectItem>
                      <SelectItem value="Jhenaidah">Jhenaidah</SelectItem>
                      <SelectItem value="Khulna">Khulna</SelectItem>
                      <SelectItem value="Kushtia">Kushtia</SelectItem>
                      <SelectItem value="Magura">Magura</SelectItem>
                      <SelectItem value="Meherpur">Meherpur</SelectItem>
                      <SelectItem value="Narail">Narail</SelectItem>
                      <SelectItem value="Satkhira">Satkhira</SelectItem>

                      <SelectItem value="Bogura">Bogura</SelectItem>
                      <SelectItem value="Joypurhat">Joypurhat</SelectItem>
                      <SelectItem value="Naogaon">Naogaon</SelectItem>
                      <SelectItem value="Natore">Natore</SelectItem>
                      <SelectItem value="Chapai Nawabganj">
                        Chapai Nawabganj
                      </SelectItem>
                      <SelectItem value="Pabna">Pabna</SelectItem>
                      <SelectItem value="Rajshahi">Rajshahi</SelectItem>
                      <SelectItem value="Sirajganj">Sirajganj</SelectItem>

                      <SelectItem value="Dinajpur">Dinajpur</SelectItem>
                      <SelectItem value="Gaibandha">Gaibandha</SelectItem>
                      <SelectItem value="Kurigram">Kurigram</SelectItem>
                      <SelectItem value="Lalmonirhat">Lalmonirhat</SelectItem>
                      <SelectItem value="Nilphamari">Nilphamari</SelectItem>
                      <SelectItem value="Panchagarh">Panchagarh</SelectItem>
                      <SelectItem value="Rangpur">Rangpur</SelectItem>
                      <SelectItem value="Thakurgaon">Thakurgaon</SelectItem>

                      <SelectItem value="Habiganj">Habiganj</SelectItem>
                      <SelectItem value="Moulvibazar">Moulvibazar</SelectItem>
                      <SelectItem value="Sunamganj">Sunamganj</SelectItem>
                      <SelectItem value="Sylhet">Sylhet</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                <ControlGroup className="w-full h-10">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Charge</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      placeholder="Delivery charge"
                     onChange={(e) =>
                    setDistrictInput({
                      ...districtInput,
                      charge: e.target.value,
                    })
                  }
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
                <Button
                  onClick={() =>
                    setDistrictsList([...districtsList, districtInput])
                  }
                  variant="outline"
                  className='h-10'
                >
                  Add <span className="text-xl">+</span>
                </Button>
              </div>
              <div className="space-y-6">
                {districtsList.map((district, index) => (
                  <div key={index} className="flex items-center gap-6 ">
                    <div className=" w-full pr-8 px-3 py-2 border rounded-md">
                      {district.name}
                    </div>
                    <div className="w-full px-3 py-2 border rounded-md ">
                      {district.charge}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className=" flex items-center gap-2 px-4 w-20 h-10"
                      onClick={() => {
                        const updated = districtsList.filter(
                          (_, i) => i !== index
                        );
                        setDistrictsList(updated);
                      }}
                    >
                      Del
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {deliveryOptions == "upazilla" && (
            <div>
              <div className="flex flex-col md:flex-row gap-6 pb-6">
                <Select
                  onValueChange={(val) => {
                    setUpazilaInput({ ...upazilaInput, name: val });
                  }}
                >
                  <SelectPrimitive.Trigger
                    className={cn(
                      "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                      "w-full"
                    )}
                  >
                    <SelectValue placeholder="Select upazila" />
                    <SelectPrimitive.Icon asChild>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </SelectPrimitive.Icon>
                  </SelectPrimitive.Trigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Upazilas</SelectLabel>
                      <SelectItem value="adabar">Adabar</SelectItem>
                      <SelectItem value="badda">Badda</SelectItem>
                      <SelectItem value="banani">Banani</SelectItem>
                      <SelectItem value="bangshal">Bangshal</SelectItem>
                      <SelectItem value="bimanbandar">Bimanbandar</SelectItem>
                      <SelectItem value="cantonment">Cantonment</SelectItem>
                      <SelectItem value="chawkbazar">Chawkbazar</SelectItem>
                      <SelectItem value="dakshinkhan">Dakshinkhan</SelectItem>
                      <SelectItem value="dhanmondi">Dhanmondi</SelectItem>
                      <SelectItem value="gendaria">Gendaria</SelectItem>
                      <SelectItem value="gulshan">Gulshan</SelectItem>
                      <SelectItem value="hazaribagh">Hazaribagh</SelectItem>
                      <SelectItem value="jatrabari">Jatrabari</SelectItem>
                      <SelectItem value="kafrul">Kafrul</SelectItem>
                      <SelectItem value="kalabagan">Kalabagan</SelectItem>
                      <SelectItem value="kamrangirchar">
                        Kamrangirchar
                      </SelectItem>
                      <SelectItem value="keraniganj">Keraniganj</SelectItem>
                      <SelectItem value="khilgaon">Khilgaon</SelectItem>
                      <SelectItem value="khilkhet">Khilkhet</SelectItem>
                      <SelectItem value="lalbagh">Lalbagh</SelectItem>
                      <SelectItem value="mirpur">Mirpur</SelectItem>
                      <SelectItem value="mohammadpur">Mohammadpur</SelectItem>
                      <SelectItem value="motijheel">Motijheel</SelectItem>
                      <SelectItem value="mugda">Mugda</SelectItem>
                      <SelectItem value="new_market">New Market</SelectItem>
                      <SelectItem value="pallabi">Pallabi</SelectItem>
                      <SelectItem value="paltan">Paltan</SelectItem>
                      <SelectItem value="ramna">Ramna</SelectItem>
                      <SelectItem value="rampura">Rampura</SelectItem>
                      <SelectItem value="sabujbagh">Sabujbagh</SelectItem>
                      <SelectItem value="savar">Savar</SelectItem>
                      <SelectItem value="shah_ali">Shah Ali</SelectItem>
                      <SelectItem value="shahbagh">Shahbagh</SelectItem>
                      <SelectItem value="sher-e-bangla_nagar">
                        Sher-e-Bangla Nagar
                      </SelectItem>
                      <SelectItem value="shyampur">Shyampur</SelectItem>
                      <SelectItem value="tejgaon">Tejgaon</SelectItem>
                      <SelectItem value="uttara">Uttara</SelectItem>
                      <SelectItem value="uttarkhan">Uttarkhan</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <ControlGroup className="w-full h-10">
              <ControlGroupItem>
                <InputBase><InputBaseAdornment>Charge</InputBaseAdornment></InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="flex-1">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput
                      placeholder="Delivery charge"
                    onChange={(e) =>
                    setUpazilaInput({ ...upazilaInput, charge: e.target.value })
                  }
                    />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
                <Button
                  onClick={() => {
                    setUpazilasList([...upazilasList, upazilaInput]);
                  }}
                  variant="outline"
                  className="h-10"
                >
                  Add <span className="text-xl">+</span>
                </Button>
              </div>
              <div className=" space-y-4">
                {upazilasList.map((upazila, index) => (
                  <div key={index} className="flex items-center gap-6">
                    <div className="w-full pr-8 px-3 py-2 border rounded-md">
                      {upazila.name}
                    </div>
                    <div className="w-full px-3 py-2 border rounded-md">
                      {upazila.charge}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2 px-4 w-20 h-10"
                      onClick={() => {
                        const updated = upazilasList.filter(
                          (_, i) => i !== index
                        );
                        setUpazilasList(updated);
                      }}
                    >
                      Del
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button>Save Delivery Charges</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-4">
          <Label className="text-md font-semibold">
            Integrate Delivery Services
          </Label>

          <div className="space-y-6">
            <div className="flex gap-6">
              {country.gateway.map((courier) => (
                <Button
                  key={courier.shortCode}
                  variant="outline"
                  onClick={() => setSelectedCourier(courier.name)}
                  className={
                    selectedCourier === courier.name
                      ? "border-2 p-2  border-foreground rounded-lg"
                      : "border-2 p-2  rounded-lg"
                  }
                >
                  <Image
                    src={courier.logo}
                    alt="Steadfast"
                    width={100}
                    height={30}
                  />
                </Button>
              ))}
            </div>
          </div>
          {country.gateway.map(
            (courier) =>
              selectedCourier === courier.name && (
                <div key={courier.shortCode} className="space-y-6">
                  {courier.fields.map((field) => (
                    <ControlGroup className="w-full h-10" key={field.name}>
                      <ControlGroupItem>
                        <InputBase><InputBaseAdornment>{field.name}</InputBaseAdornment></InputBase>
                      </ControlGroupItem>
                      <ControlGroupItem className="flex-1">
                        <InputBase>
                          <InputBaseControl>
                            <InputBaseInput
                              type={field.type}
                              required={field.required}
                              placeholder={`Enter ${field.name}`}
                              onChange={(e) =>
                                setCourierForm((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                              }))}
                            />
                         </InputBaseControl>
                        </InputBase>
                      </ControlGroupItem>
                    </ControlGroup>
                  ))}
                  <div  className="flex justify-end">
                    <Button onClick={handleCourierSubmit}>
                    Add <span className="text-xl">+</span>
                  </Button>
                  </div>
                
                </div>
              )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
