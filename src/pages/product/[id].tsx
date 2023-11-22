import { GetStaticPaths, GetStaticProps } from 'next';
import { ImageContainer, ProductContainer, ProductDetails } from '@/styles/pages/products';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { stripe } from "../../lib/stripe";
import Stripe from 'stripe';
import axios from 'axios';
import { useState } from 'react';
import Head from 'next/head';

interface ProductProps {
    product: {
      id: string;
      name: string;
      imageUrl: string;
      price: string;
      description: string;
      defaultPriceId: string;
    }
  }

export default function Product({ product }: ProductProps) {
    const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] = useState(false)

    async function handleBuyProduct() {
        // Se fosse um redirecionamento interno
        // const router = useRouter()

        try {
            setIsCreatingCheckoutSession(true)

            const response = await axios.post('/api/checkout', {
                // Parâmetros a serem enviados
                priceId: product.defaultPriceId,
            })

            const { checkoutUrl } = response.data;

            console.log(checkoutUrl)

            // Se fosse um redirecionamento interno
            // router.push('/checkout')

            // Redirecionamento do usuário
            window.location.href = checkoutUrl

            // console.log(product.defaultPriceId)
        } catch (err) {
            // Conectar com uma ferramenbta de observalidade (Datadog  / Sentry)

            setIsCreatingCheckoutSession(false)

            alert('Falha ao redirecionar ao checkout')
        }
    }

    // objeto query permite que acessemos os params. Se desabilitar o JS esse conteúdo não será carregado se for o caso de um indexador.
    // const { query } = useRouter()

    // O isFallback serve para sabermos se estamos fazendo um loading. Se sim, seria true
    const { isFallback } = useRouter()


    if (isFallback) {
        return 'Loading...'
    }

    console.log(product)

    return (
        <>
        <Head>
            <title>{product.name} | Ignite Shop</title>
        </Head>
        <ProductContainer>
            <ImageContainer>
                <Image src={product.imageUrl} width={520} height={480} alt="" />
            </ImageContainer>

            <ProductDetails>
                <h1>{product.name}</h1>
                <span>{product.price}</span>
                <p>{product.description}</p>

                <button disabled={isCreatingCheckoutSession} onClick={handleBuyProduct}>Comprar agora</button>
            </ProductDetails>
        </ProductContainer>
        </>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    // No Paths o ideal é buscar os produtos mais vendidos ou mais acessados devido ao build. Aí o fallback ficaria true, pois assim ele tentará buscar os ids de produtos com o getStaticProps e aí gerar a versão estática dos produtos

    return {
        paths: [
            { params: { id: 'prod_OsHgyDr0vJxoZ6'} }
        ],
        fallback: true
    }
}

export const getStaticProps: GetStaticProps<any, { id: string }> = async ({ params }) => {
    // Acessa o ID do produto por parâmetro
    const productId = params!.id;

    // Busca o produto no stripe
    const product = await stripe.products.retrieve(productId, {
        expand: ['default_price'],
    })

    const price = product.default_price as Stripe.Price

    return {
        props: {
          product: {
            id: product.id,
            name: product.name,
            imageUrl: product.images[0],
            price: new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(price.unit_amount! / 100),
            description: product.description,
            defaultPriceId: price.id,
          },
        },
        revalidate: 60 * 60 * 1,
      }
}