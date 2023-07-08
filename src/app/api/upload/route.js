import { NextResponse } from "next/server";
import axios from 'axios'
import streamifier from 'streamifier';
const FormData = require('form-data');


const starton = axios.create({
    baseURL: "https://api.starton.io/v3",
    headers: {
        "x-api-key": "sk_live_f3f4074e-be35-4bfa-83c6-feca2124b5f1",
        
    },
  })

export const POST = async (req,res) => {
    console.log("Running POST Request !!!")
    try {
        const { imageData, receiverAddress,fileName } = await req.json();

    async function uploadImageOnIpfs(){
        try {
            const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
            const imageStream = streamifier.createReadStream(imageBuffer);

            let data = new FormData();
            data.append('file', imageStream, { filename: fileName });
            data.append("isSync","true");

            const ipfsImg = await starton.post("/ipfs/file", data, {
                headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
              })
              return ipfsImg.data;
          } catch (error) {
            console.error('Error storing image:', error);
          } 
    }

    async function uploadMetadataOnIpfs(imgCid){
        const metadataJson = {
            name: `Holymoly NFT`,
            description: `This is holymoly nft !`,
            image: `ipfs://ipfs/${imgCid}`,
        }
        const ipfsMetadata = await starton.post("/ipfs/json", {
            name: "Holmoly NFT metadata Json",
            content: metadataJson,
            isSync: true,
        })
        return ipfsMetadata.data;
    }
    
    const SMART_CONTRACT_NETWORK="polygon-mumbai"
    const SMART_CONTRACT_ADDRESS="0x57B0710b7AA36ef40bb8B28C6768e1d9721B84ef"
    const WALLET_IMPORTED_ON_STARTON="0xE4e3159F2b1bfE3bEFc153816f816a55f53E8289";
    async function mintNFT(receiverAddress,metadataCid){
        const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
            functionName: "mint",
            signerWallet: WALLET_IMPORTED_ON_STARTON,
            speed: "low",
            params: [receiverAddress, metadataCid],
        })
        return nft.data;
    }
    const ipfsImgData = await uploadImageOnIpfs();
    const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
    const nft = await mintNFT(receiverAddress,ipfsMetadata.cid)
    // console.log(nft)
    console.log("nft minted")
    return new NextResponse(
        JSON.stringify({
          transactionHash: nft.transactionHash,
          cid: ipfsImgData.cid,
        }),
        { status: 201 }
      );
    } catch (error) {
        console.error(error);
        return new NextResponse(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
      }
  }
  