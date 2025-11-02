export interface ProfileSummaryInput{
    FirstName:string,
    LastName:string,
    title:string,
    about:string
}

export interface PersonalInfoInput{
    address?: string,
    address_line_2?: string,
    zipCode?: string,
    countryId?: number,
    stateId?: number,
    city?: string,
    website?: string,
    hideEmail?: boolean,
    hidePhone?: boolean,
    links?: Array<{
        platform: string,
        url: string
    }>
}

export interface HourlyRateInput{
    hourly_rate: number,
    currency: string
}