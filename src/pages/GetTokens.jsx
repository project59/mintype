import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";

export default function GetTokens() {
    return (
        <div className='flex flex-col h-full'>
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">Get Tokens</h1>
            </PageHeaderWrapper>
            <PageSectionWrapper>
                <p className="textRegular max-w-lg">
                    Mintype tokens can be used to purchase items from the store, and help support the development of the app.
                </p>

                <h2 className="textTitle">
                    How can I get tokens?
                </h2>

                <div className="flex flex-wrap gap-4">
                    <div className="h-64 w-full md:w-64 bg-amber-100 rounded-xl p-4 flex flex-col justify-end gap-3">
                        <div className="text-2xl font-semibold text-black">
                            Purchase
                        </div>

                        <p className="text-black text-sm">
                            Get 1 token instantly for $5 USD. No expiry.
                        </p>

                        <button className="btnPrimary w-fit">
                            Buy Now
                        </button>
                    </div>

                    <div className="h-64 w-full md:w-64 bg-lime-100 rounded-xl p-4 flex flex-col justify-end gap-3">
                        <div className="text-2xl font-semibold text-black">
                            Submitting a Template or Sticker
                        </div>
                        <p className="text-black text-sm">
                            Get 5 tokens for submitting a template or sticker to the store.
                        </p>
                        <button className="btnPrimary w-fit">
                            Instructions
                        </button>
                    </div>

                    <div className="h-64 w-full md:w-64 bg-orange-100 rounded-xl p-4 flex flex-col justify-end gap-3">
                        <div className="text-2xl font-semibold text-black">
                            Submitting Feedback
                        </div>
                        <p className="text-black text-sm">
                            Get 1 token for providing feedback in our app.
                        </p>
                        <button className="btnPrimary w-fit">
                            Submit
                        </button>
                    </div>
                </div>
            </PageSectionWrapper>
        </div>
    );
}